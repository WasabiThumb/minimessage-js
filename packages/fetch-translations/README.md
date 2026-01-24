# @minimessage-js/fetch-translations
Fetches Minecraft: Java Edition client translation data from the internet,
ready for use in ``minimessage-js``.

> [!TIP]
> For synchronous access to translation data, use ``@minimessage-js/translations``.

> [!IMPORTANT]
> This library relies on ``piston-meta.mojang.com``,
> ``piston-data.mojang.com`` and ``resources.download.minecraft.net``.
> Any outages or major changes with respect to these services
> can cause this library to break.

## Usage
```ts
import MinecraftTranslations from "@minimessage-js/fetch-translations";

// Fetches the list of valid locale keys
MinecraftTranslations.list(); // Promise<string[]>

// Retrieves translation data
MinecraftTranslations.get("en_us"); // Promise<Record<string, string>>
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
