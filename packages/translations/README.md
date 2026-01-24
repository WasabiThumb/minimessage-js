# @minimessage-js/translations
Provides Minecraft: Java Edition client translation data, ready for use
in ``minimessage-js``.

> [!WARNING]
> This package is very large. To instead fetch translations
> from the internet at runtime, use ``@minimessage-js/fetch-translations``.

## Usage
```ts
import MinecraftTranslations from "@minimessage-js/translations";

// Latest MC:JE release at build time (e.g. 1.21.11)
const version = MinecraftTranslations.version;

// Array of language keys
const list = MinecraftTranslations.list();

// Get American English translations
const translations = MinecraftTranslations.get("en_us");
```

## License
```text
Copyright 2026 Xavier Pedraza

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0
    
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

