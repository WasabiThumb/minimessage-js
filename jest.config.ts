import {createDefaultEsmPreset, type JestConfigWithTsJest} from "ts-jest";

const presetConfig = createDefaultEsmPreset({
  tsconfig: "tsconfig.test.json",
});

const jestConfig: JestConfigWithTsJest = {
  ...presetConfig,
  roots: [ "<rootDir>/tests/" ]
}

export default jestConfig;
