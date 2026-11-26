use aho_corasick::AhoCorasick;
use once_cell::sync::Lazy;
use regex::RegexSet;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use wasm_bindgen::prelude::*;

static SCRAMBLE_MAP: Lazy<Mutex<HashMap<String, String>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanRule {
    pub id: String,
    pub category: String,
    pub pattern: String,
    #[serde(default)]
    pub literal: bool,
    #[serde(default = "default_true")]
    pub case_insensitive: bool,
    #[serde(default = "default_mask")]
    pub mask: String,
}

fn default_true() -> bool {
    true
}
fn default_mask() -> String {
    "scramble".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanInput {
    pub id: String,
    pub text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanMatch {
    pub start: usize,
    pub end: usize,
    pub replacement: String,
    pub rule_id: String,
    pub category: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    pub id: String,
    pub text: String,
    pub matches: Vec<ScanMatch>,
}

#[derive(Debug, Default)]
struct CompiledRules {
    literal: Option<AhoCorasick>,
    literal_rules: Vec<ScanRule>,
    regex: Option<RegexSet>,
    regex_rules: Vec<ScanRule>,
    regex_compiled: Vec<regex::Regex>,
}

static RULES: Lazy<Mutex<CompiledRules>> = Lazy::new(|| Mutex::new(CompiledRules::default()));

#[wasm_bindgen]
pub fn init_engine(rules_json: &str) -> Result<(), JsValue> {
    let rules: Vec<ScanRule> = serde_json::from_str(rules_json)
        .map_err(|e| JsValue::from_str(&format!("invalid rules json: {e}")))?;

    let mut literal_patterns: Vec<String> = Vec::new();
    let mut literal_rules: Vec<ScanRule> = Vec::new();
    let mut regex_patterns: Vec<String> = Vec::new();
    let mut regex_rules: Vec<ScanRule> = Vec::new();
    let mut regex_compiled: Vec<regex::Regex> = Vec::new();

    for rule in rules {
        if rule.pattern.trim().is_empty() {
            continue;
        }
        if rule.literal {
            literal_patterns.push(rule.pattern.clone());
            literal_rules.push(rule);
        } else {
            let pat = if rule.case_insensitive {
                format!("(?i){}", rule.pattern)
            } else {
                rule.pattern.clone()
            };
            match regex::Regex::new(&pat) {
                Ok(r) => {
                    regex_compiled.push(r);
                    regex_patterns.push(pat);
                    regex_rules.push(rule);
                }
                Err(_) => {
                    // Skip invalid regex; UI/schema should catch most, engine stays resilient.
                }
            }
        }
    }

    let literal = if literal_patterns.is_empty() {
        None
    } else {
        AhoCorasick::builder()
            .ascii_case_insensitive(true)
            .build(&literal_patterns)
            .ok()
    };

    let regex = if regex_patterns.is_empty() {
        None
    } else {
        RegexSet::new(&regex_patterns).ok()
    };

    let mut guard = RULES.lock().map_err(|_| JsValue::from_str("lock poisoned"))?;
    *guard = CompiledRules {
        literal,
        literal_rules,
        regex,
        regex_rules,
        regex_compiled,
    };
    Ok(())
}

#[wasm_bindgen]
pub fn clear_session() -> Result<(), JsValue> {
    let mut map = SCRAMBLE_MAP
        .lock()
        .map_err(|_| JsValue::from_str("lock poisoned"))?;
    map.clear();
    Ok(())
}

#[wasm_bindgen]
pub fn scan_batch(input_json: &str, mode: &str) -> Result<String, JsValue> {
    let inputs: Vec<ScanInput> = serde_json::from_str(input_json)
        .map_err(|e| JsValue::from_str(&format!("invalid input json: {e}")))?;
    let guard = RULES.lock().map_err(|_| JsValue::from_str("lock poisoned"))?;
    let mut out = Vec::with_capacity(inputs.len());
    for input in inputs {
        let matches = scan_text(&guard, &input.text, mode);
        let masked = apply_matches(&input.text, &matches);
        out.push(ScanResult {
            id: input.id,
            text: masked,
            matches,
        });
    }
    serde_json::to_string(&out).map_err(|e| JsValue::from_str(&format!("serialize error: {e}")))
}

fn scan_text(rules: &CompiledRules, text: &str, mode: &str) -> Vec<ScanMatch> {
    let mut raw: Vec<ScanMatch> = Vec::new();

    if let Some(ac) = &rules.literal {
        for mat in ac.find_iter(text) {
            let idx = mat.pattern().as_usize();
            if let Some(rule) = rules.literal_rules.get(idx) {
                let start = mat.start();
                let end = mat.end();
                if !is_word_boundary(text, start, end) {
                    continue;
                }
                let original = &text[start..end];
                raw.push(ScanMatch {
                    start,
                    end,
                    replacement: mask_value(original, mode, &rule.mask),
                    rule_id: rule.id.clone(),
                    category: rule.category.clone(),
                });
            }
        }
    }

    if let (Some(set), true) = (&rules.regex, !rules.regex_compiled.is_empty()) {
        for i in set.matches(text).into_iter() {
            let Some(re) = rules.regex_compiled.get(i) else { continue };
            let Some(rule) = rules.regex_rules.get(i) else { continue };
            for m in re.find_iter(text) {
                if m.start() == m.end() {
                    continue;
                }
                let original = m.as_str();
                raw.push(ScanMatch {
                    start: m.start(),
                    end: m.end(),
                    replacement: mask_value(original, mode, &rule.mask),
                    rule_id: rule.id.clone(),
                    category: rule.category.clone(),
                });
            }
        }
    }

    resolve_overlaps(raw)
}

fn is_word_boundary(text: &str, start: usize, end: usize) -> bool {
    let bytes = text.as_bytes();
    let before_ok = if start == 0 {
        true
    } else {
        !is_word_char(bytes[start - 1] as char)
    };
    let after_ok = if end >= bytes.len() {
        true
    } else {
        !is_word_char(bytes[end] as char)
    };
    before_ok && after_ok
}

fn is_word_char(c: char) -> bool {
    c.is_alphanumeric() || c == '_' || c == '-'
}

fn resolve_overlaps(mut matches: Vec<ScanMatch>) -> Vec<ScanMatch> {
    matches.sort_by(|a, b| a.start.cmp(&b.start).then(b.end.cmp(&a.end)));
    let mut out: Vec<ScanMatch> = Vec::new();
    for m in matches {
        if let Some(last) = out.last() {
            if m.start < last.end {
                // overlap: keep longer/earlier
                if m.end > last.end && m.start == last.start {
                    *out.last_mut().unwrap() = m;
                }
                continue;
            }
        }
        out.push(m);
    }
    out
}

fn apply_matches(text: &str, matches: &[ScanMatch]) -> String {
    if matches.is_empty() {
        return text.to_string();
    }
    let mut out = String::with_capacity(text.len());
    let mut cursor = 0usize;
    for m in matches {
        if m.start < cursor || m.end > text.len() || m.start > m.end {
            continue;
        }
        out.push_str(&text[cursor..m.start]);
        out.push_str(&m.replacement);
        cursor = m.end;
    }
    out.push_str(&text[cursor..]);
    out
}

fn mask_value(original: &str, mode: &str, rule_mask: &str) -> String {
    let effective = if mode == "inherit" || mode.is_empty() {
        rule_mask
    } else {
        mode
    };
    match effective {
        "blur" => "\u{2588}\u{2588}\u{2588}\u{2588}".to_string(),
        "random-word" | "random_word" | "word" => deterministic_word(original),
        "scramble" | _ => scramble_letters(original),
    }
}

fn deterministic_word(original: &str) -> String {
    const WORDS: &[&str] = &[
        "acorn", "amber", "atlas", "basil", "birch", "bramble", "cedar", "cinder", "clover",
        "comet", "coral", "crimson", "delta", "dune", "ember", "falcon", "fern", "frost",
        "garnet", "grove", "harbor", "hazel", "indigo", "ivory", "juniper", "lumen", "maple",
        "moss", "nebula", "onyx", "opal", "orbit", "pebble", "pine", "quartz", "raven",
        "reef", "river", "sage", "solace", "spruce", "stone", "summit", "thistle", "topaz",
        "umber", "vale", "willow", "zephyr",
    ];
    let key = format!("w:{}", original.to_lowercase());
    if let Ok(mut map) = SCRAMBLE_MAP.lock() {
        if let Some(v) = map.get(&key) {
            return v.clone();
        }
        let idx = stable_hash(&key) % WORDS.len();
        let v = WORDS[idx].to_string();
        map.insert(key, v.clone());
        return v;
    }
    "redacted".to_string()
}

fn scramble_letters(original: &str) -> String {
    let key = format!("s:{}", original);
    if let Ok(mut map) = SCRAMBLE_MAP.lock() {
        if let Some(v) = map.get(&key) {
            return v.clone();
        }
        let v = scramble_with_hash(original, stable_hash(&key));
        map.insert(key, v.clone());
        return v;
    }
    scramble_with_hash(original, stable_hash(original))
}

fn scramble_with_hash(original: &str, seed: usize) -> String {
    let chars: Vec<char> = original.chars().collect();
    let mut letters: Vec<char> = chars.iter().copied().filter(|c| c.is_alphabetic()).collect();
    if letters.len() <= 1 {
        return "█".repeat(chars.len().max(1));
    }
    // deterministic Fisher-Yates
    let mut s = seed as u64 ^ 0x9e3779b97f4a7c15;
    for i in (1..letters.len()).rev() {
        s = xorshift64(s);
        let j = (s as usize) % (i + 1);
        letters.swap(i, j);
    }
    // avoid identical output when possible
    let orig_letters: Vec<char> = chars.iter().copied().filter(|c| c.is_alphabetic()).collect();
    if letters == orig_letters && letters.len() > 1 {
        letters.swap(0, 1);
    }

    let mut li = 0usize;
    let mut out = String::with_capacity(original.len());
    for c in chars {
        if c.is_alphabetic() {
            let mut r = letters[li];
            if c.is_uppercase() {
                r = r.to_uppercase().next().unwrap_or(r);
            } else {
                r = r.to_lowercase().next().unwrap_or(r);
            }
            out.push(r);
            li += 1;
        } else {
            out.push(c);
        }
    }
    out
}

fn stable_hash(s: &str) -> usize {
    // FNV-1a 64-bit, deterministic across sessions/wasm
    let mut hash: u64 = 0xcbf29ce484222325;
    for b in s.as_bytes() {
        hash ^= *b as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    hash as usize
}

fn xorshift64(mut x: u64) -> u64 {
    if x == 0 { x = 0xdeadbeefcafebabe; }
    x ^= x << 13;
    x ^= x >> 7;
    x ^= x << 17;
    x
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rule(id: &str, cat: &str, pat: &str, literal: bool, mask: &str) -> ScanRule {
        ScanRule {
            id: id.to_string(),
            category: cat.to_string(),
            pattern: pat.to_string(),
            literal,
            case_insensitive: true,
            mask: mask.to_string(),
        }
    }

    #[test]
    fn literal_and_regex_scan() {
        let rules = vec![
            rule("n1", "names", "Yassine", true, "random-word"),
            rule("k1", "api", r"ghp_[A-Za-z0-9]{36}", false, "scramble"),
        ];
        init_engine(&serde_json::to_string(&rules).unwrap()).unwrap();
        clear_session().unwrap();
        let input = vec![ScanInput {
            id: "1".into(),
            text: "Hello Yassine token ghp_abcdefghijklmnopqrstuvwxyz0123456789".into(),
        }];
        let out = scan_batch(&serde_json::to_string(&input).unwrap(), "inherit").unwrap();
        let res: Vec<ScanResult> = serde_json::from_str(&out).unwrap();
        assert_eq!(res.len(), 1);
        assert!(!res[0].text.contains("Yassine"));
        assert!(!res[0].text.contains("ghp_abcdefghijklmnopqrstuvwxyz0123456789"));
        assert!(res[0].matches.len() >= 2);
    }

    #[test]
    fn deterministic_masking() {
        clear_session().unwrap();
        let a = deterministic_word("Alice");
        let b = deterministic_word("Alice");
        let c = deterministic_word("alice");
        assert_eq!(a, b);
        assert_eq!(a, c);
        let s1 = scramble_letters("Roa");
        let s2 = scramble_letters("Roa");
        assert_eq!(s1, s2);
        assert_ne!(s1, "Roa");
    }
}
