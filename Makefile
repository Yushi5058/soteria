.PHONY: build test package clean

build:
	bash scripts/build.sh

test:
	bash scripts/test.sh

package:
	bash scripts/package.sh

clean:
	rm -rf dist extension/dist extension/src/wasm/pkg engine/target artifacts soteria-v1.0.0.xpi
