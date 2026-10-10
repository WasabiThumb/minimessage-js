# @minimessage-js/pack-loader
Loads ``ResourcePacks`` from ZIP files for ``minimessage-js``.

> [!IMPORTANT]
> Before installing this library after cloning, make sure that
> ``minimessage-js`` is linked (run ``bun link``,
> then go to ``packages/pack-loader`` and run ``bun link minimessage-js``).

## Usage
```js
import loadResourcePacks from "@minimessage-js/pack-loader";

// Load the MC 26.3 vanilla client JAR
const vanilla = await loadResourcePacks("https://piston-data.mojang.com/v1/objects/e877b6a07acd633fb3bb475002175cec036e7b87/client.jar");

// Use it to construct a MiniMessage instance
const mini = MiniMessage.builder()
    .resourcePacks(vanilla)
    .build();

// Render a sprite tag
const component = mini.deserialize(`<sprite:block/magenta_wool>`);
mini.toHTML(component, element);
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
