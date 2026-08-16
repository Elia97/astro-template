# Changelog

## 1.0.0 (2026-08-16)


### Features

* add base layout, SEO head, and dark mode ([#11](https://github.com/Elia97/astro-template/issues/11)) ([0408800](https://github.com/Elia97/astro-template/commit/0408800f5545a7207f94e2c4bd1ed1c9bea2783e))
* add cli collection generator ([#16](https://github.com/Elia97/astro-template/issues/16)) ([39b4bb9](https://github.com/Elia97/astro-template/commit/39b4bb9408de7066a07f0313913acc3ec889a165))
* add cli scaffold harness (page/component generators) ([#15](https://github.com/Elia97/astro-template/issues/15)) ([d5d0ce1](https://github.com/Elia97/astro-template/commit/d5d0ce1f87b56901bb96eacd91367655022c6648))
* add cli section generator ([#17](https://github.com/Elia97/astro-template/issues/17)) ([62fd567](https://github.com/Elia97/astro-template/commit/62fd567c874e27072ef11f221803fa17611b7538))
* add container and section layout primitives ([#14](https://github.com/Elia97/astro-template/issues/14)) ([56995e5](https://github.com/Elia97/astro-template/commit/56995e542d3e9a1cbfc4c23a015afeb074d9a07d))
* add design tokens and Tailwind v4 pipeline ([#7](https://github.com/Elia97/astro-template/issues/7)) ([0671b29](https://github.com/Elia97/astro-template/commit/0671b29707f54101bc0af6fafc2ff9766b2441b6))
* add homepage sections pattern with hero ([#13](https://github.com/Elia97/astro-template/issues/13)) ([7b38a28](https://github.com/Elia97/astro-template/commit/7b38a28f6bf0d974ba5b88465ba92b35c24fd413))
* add issue-driven /milestone + /pr workflow ([#23](https://github.com/Elia97/astro-template/issues/23)) ([a4a1de8](https://github.com/Elia97/astro-template/commit/a4a1de89dfec30a07d50ab3562766cbd8d492b9c))
* add native Astro i18n routing ([#9](https://github.com/Elia97/astro-template/issues/9)) ([8a5c0f3](https://github.com/Elia97/astro-template/commit/8a5c0f3ec16d7e5c80979d45c46393f4eb71268d))
* add native ui primitives (cva-based, no React runtime) ([#12](https://github.com/Elia97/astro-template/issues/12)) ([528990e](https://github.com/Elia97/astro-template/commit/528990ec790edfc037a1bdf6c0efe4cf205967c5))
* **ci:** gate main with a ruleset and blank the squash body ([3052704](https://github.com/Elia97/astro-template/commit/3052704120727a4a68b03476ee73c78757995917))
* **cli:** add collection generator ([39b4bb9](https://github.com/Elia97/astro-template/commit/39b4bb9408de7066a07f0313913acc3ec889a165))
* **config:** add Astro native i18n routing ([8a5c0f3](https://github.com/Elia97/astro-template/commit/8a5c0f3ec16d7e5c80979d45c46393f4eb71268d))
* **consent:** gate analytics and hosted legal docs behind a CMP ([6c3e861](https://github.com/Elia97/astro-template/commit/6c3e861687cb97a74e01bc0b2c0f4e12c7940e57))
* **forms:** add Vercel BotID as the third abuse layer, in observe mode ([6ca83d8](https://github.com/Elia97/astro-template/commit/6ca83d8134a23598da0f1238e1e271a8637bd90b))
* **forms:** drop bot submissions with a honeypot decoy ([6f7ba93](https://github.com/Elia97/astro-template/commit/6f7ba93b5f622145e26e73f632a5d3f78421db5e))
* **forms:** surface validation errors per field, and guard the contract ([515c61b](https://github.com/Elia97/astro-template/commit/515c61bfd6da9a6829d7e753a7dcc9df647be164))
* improve template ([#27](https://github.com/Elia97/astro-template/issues/27)) ([b003aaa](https://github.com/Elia97/astro-template/commit/b003aaa24ba79aa83d257b5c0c71ae498a78f3e9))
* **ops:** add /approach, the decision step that runs before /pr ([a0ca4f3](https://github.com/Elia97/astro-template/commit/a0ca4f35f62ba6813ccc0118f607a9b6d2640f06))
* **ops:** add a manual production deploy that runs the same gates ([384c512](https://github.com/Elia97/astro-template/commit/384c51241615001596cba440536a5947cd2f0eca))
* **ops:** allow an opt-in admin bypass on the main ruleset ([78e1bbb](https://github.com/Elia97/astro-template/commit/78e1bbbd66930ab9ca87b2b4f768399770a8d354))
* **ops:** enforce the documented source layering with fallow boundaries ([3bd778a](https://github.com/Elia97/astro-template/commit/3bd778aa716b69a6b6435fa52064d9ff9d745a9d))
* **ops:** feed real coverage to the audit gate so crap scores mean something ([ba6ce5e](https://github.com/Elia97/astro-template/commit/ba6ce5e940ae7688c8c4d64cbf559d1838ad9eb2))
* **ops:** gate the /pr flow on a diff-scoped fallow audit ([65d6f5c](https://github.com/Elia97/astro-template/commit/65d6f5ce4ea53c67304670c746d272afaac871d1))
* **ops:** pin functions to fra1 and redirect www to the apex ([7c502a8](https://github.com/Elia97/astro-template/commit/7c502a80e4c60bb4a69020a52e7e24ef279680ec))
* **ops:** smoke-test production after the release deploy ([1fc4433](https://github.com/Elia97/astro-template/commit/1fc44338c37cd656531db9c9f19564898d898d26))
* **perf:** gate every route with a client-JS bundle budget ([b570ecb](https://github.com/Elia97/astro-template/commit/b570ecbc193dc59081790c247d91e0a48a218f18))
* **perf:** put the render-blocking stylesheet under the bundle budget ([ea1163f](https://github.com/Elia97/astro-template/commit/ea1163f9abb357343744f64184504fb7cfbf9fae))
* **security:** hash-based CSP at build time and a fallow gate in CI ([#13](https://github.com/Elia97/astro-template/issues/13)) ([17d6b86](https://github.com/Elia97/astro-template/commit/17d6b86a74d3faa46d0b40d6e57e63c55b64b994))
* **seo:** add a `noindex` prop that reaches prerendered pages ([03308cb](https://github.com/Elia97/astro-template/commit/03308cba869c657a96f549060cab5c23565c1c13))
* **seo:** make crawl exclusions a single source of truth ([5070544](https://github.com/Elia97/astro-template/commit/5070544137b7aa3daeb382858d5ef71993632dbe))
* **seo:** serve a web manifest and theme-color from SITE ([ab30e63](https://github.com/Elia97/astro-template/commit/ab30e63bef53f3cba1cc8a2dd7e66ca3c9ff3fcd))
* template hardening ([#20](https://github.com/Elia97/astro-template/issues/20)) ([cef33dc](https://github.com/Elia97/astro-template/commit/cef33dc9d893abd5d674d858b946633dd56d26e7))
* **ui:** make tokens.css the whole rebrand surface ([90cc974](https://github.com/Elia97/astro-template/commit/90cc974108020ee9258fe15fe6b482b4807f0297))


### Bug Fixes

* **content:** allowlist cta url protocols and reject protocol-relative paths ([6908b8d](https://github.com/Elia97/astro-template/commit/6908b8d95e7d2e8e1a4f918ec7515f68b3ef19c5))
* **content:** make content schemas strict so a typo'd key fails the build ([bbae37b](https://github.com/Elia97/astro-template/commit/bbae37bc440da122335e7bd3fd9230c48f2e6bea))
* **deps-dev:** bump fallow from 3.10.0 to 3.11.0 in the npm group ([#10](https://github.com/Elia97/astro-template/issues/10)) ([4e7e3a1](https://github.com/Elia97/astro-template/commit/4e7e3a172d9ae026d00aa0c47a6eb73746d0ec82))
* **deps:** override two transitive advisories past their patched versions ([b739ba4](https://github.com/Elia97/astro-template/commit/b739ba466c14cefb9bf2d67ca018bc2d9c7ee606))
* **forms:** bound the vendor request and the function duration ([e507272](https://github.com/Elia97/astro-template/commit/e507272c969fba4274763ab4768c3aa07bff1a73))
* **forms:** keep the honeypot silent when the decoy fails validation ([aae9cec](https://github.com/Elia97/astro-template/commit/aae9cec1fe0c85607c5a40fef88635d65a587377))
* **forms:** localize validation messages and enforce required parity ([f68c4ac](https://github.com/Elia97/astro-template/commit/f68c4acbfa05135a863df2c94e6d9826b8c7da1f))
* **forms:** log the submission before failing so a lost lead stays recoverable ([2d135cd](https://github.com/Elia97/astro-template/commit/2d135cd146f8f36ea34475526d7445291274d987))
* **forms:** sweep the rate-limit map so it stops growing per address ([47a345a](https://github.com/Elia97/astro-template/commit/47a345a6889150c2c722220824576137bf46641b))
* **gen:** stop the generators suggesting a destructive rollback and mis-slugging documents ([aaf74da](https://github.com/Elia97/astro-template/commit/aaf74da25b2c3d777f138abff3489cb7cf0ccada))
* **hooks:** make pre/post-tool hooks fire reliably ([1ff40b8](https://github.com/Elia97/astro-template/commit/1ff40b855bfdde2b1f1e7c57c6edccd35d27ae25))
* **legal:** fail the build when a configured policy will not fetch ([8d0b135](https://github.com/Elia97/astro-template/commit/8d0b13504b043e7780cfd17a86534b3b679158be))
* **ops:** count the prose inside a block a protected marker sits in ([875af02](https://github.com/Elia97/astro-template/commit/875af02ff15c6637d75c2f78f2ed06f545567e7d))
* **ops:** require the PR title check that decides whether a change ships ([9788c5a](https://github.com/Elia97/astro-template/commit/9788c5a32462466cac6566b95d743250e5b4ff11))
* **ops:** ship dependency and content changes with a releasable commit type ([0e36794](https://github.com/Elia97/astro-template/commit/0e367942b02047354ed00d8b2a4ff8bda320890b))
* **ops:** stop granting every workflow a write-scoped token by default ([a57d9e4](https://github.com/Elia97/astro-template/commit/a57d9e4ced25be4a4c817abaa2c7e138fe12fd20))
* **ops:** stop the bootstrap claiming direct pushes are refused under bypass ([5457ae6](https://github.com/Elia97/astro-template/commit/5457ae60861c6094c801bf79e122d68ef1993d06))
* **release:** reset release-please state for a blank template ([#25](https://github.com/Elia97/astro-template/issues/25)) ([d25ff5c](https://github.com/Elia97/astro-template/commit/d25ff5c4a23c3e8cb4138a2515c36a7eb29f2802))
* **seo:** match crawl-policy paths by subtree, not by equality ([1fa4517](https://github.com/Elia97/astro-template/commit/1fa45174be31a0e5ae85bb9ed3291ba8d2d1902a))
* **seo:** noindex preview deploys at the edge, not in middleware ([780b774](https://github.com/Elia97/astro-template/commit/780b7747a9161a86738f7f8260a797ded54c3e9a))
* **ui:** close the mobile drawer at the desktop breakpoint and inert the page behind it ([9f83ff4](https://github.com/Elia97/astro-template/commit/9f83ff48a076d3f0a81ccb5f30043d6714fddbd1))
* **ui:** give the styled select trigger the label, description and selected state ([70537dd](https://github.com/Elia97/astro-template/commit/70537dddab06b1115c28e694e88a607c4bff6951))
* **ui:** raise input borders and dark destructive text to their WCAG floors ([e2421d4](https://github.com/Elia97/astro-template/commit/e2421d476f8afa1b479b9ff06f3588187d749a86))
* **ui:** re-sync theme-color once the head has parsed ([bd927d1](https://github.com/Elia97/astro-template/commit/bd927d1957997526d7bf03953031cc9693e29f04))
* **ui:** unhide reveal content when its module never loads ([a2fce21](https://github.com/Elia97/astro-template/commit/a2fce2110e5960760110dcde6405714099d66a5e))


### Performance Improvements

* **rendering:** enable prefetch so the router earns more than a cross-fade ([6c9ec6f](https://github.com/Elia97/astro-template/commit/6c9ec6f07ba9b56e3fbca1c7fe939d386233f833))
* **ui:** name the chrome so it holds still across a view transition ([88d1b91](https://github.com/Elia97/astro-template/commit/88d1b917464dd3998c3ecac9dc774e086be084a1))


### Documentation

* bootstrap github after approval ([bb91769](https://github.com/Elia97/astro-template/commit/bb9176978fdeb5cc8efea4b2b006e678ba5f108e))
* **claude:** trim agent boilerplate and fix a dead path in the domain tables ([7911f74](https://github.com/Elia97/astro-template/commit/7911f745cc511d37c199bd8ea13023fe601daf36))
* document design-system scaffold, i18n pattern, and CLI generators in HOW_TO_USE.md ([cf8e99b](https://github.com/Elia97/astro-template/commit/cf8e99bc178f7270aef551e38b4b8722f4e48205))
* document scaffold and cli usage ([#18](https://github.com/Elia97/astro-template/issues/18)) ([cf8e99b](https://github.com/Elia97/astro-template/commit/cf8e99bc178f7270aef551e38b4b8722f4e48205))
* document the consent stack and the ported pilot patterns ([5140492](https://github.com/Elia97/astro-template/commit/5140492eb6abad89fcaa45dffd6ce3da706b9ef1))
* drop duplicated and superseded prose from the top-level docs ([00726eb](https://github.com/Elia97/astro-template/commit/00726eb2eaa68ef70753b0d1ccebbe5b05d7544e))
* **forms:** bring the forms guide back in line with the stack ([1a217f6](https://github.com/Elia97/astro-template/commit/1a217f6690a11be1697af7a42fea06c3138bfe3c))
* **guides:** deduplicate against the code and correct two stale facts ([f44c939](https://github.com/Elia97/astro-template/commit/f44c939c6f52337a00f1cc3c8c2c36236d1db654))
* **guides:** point the z-index rule at the named utilities ([5f2b8eb](https://github.com/Elia97/astro-template/commit/5f2b8eb847745cdf15761d8b9680b2be9337eca3))
* label every path machinery / config / chrome / example ([1958648](https://github.com/Elia97/astro-template/commit/1958648aadc81fd922458b2e1d5fad384e217c71))
* **ops:** write the deploy-ops guide, the last missing one ([5adf496](https://github.com/Elia97/astro-template/commit/5adf496baa2e85a53db38d9d752db1fa227bac09))
* **perf:** document what the bundle budget cannot see, and the client-safe rule ([727ae4a](https://github.com/Elia97/astro-template/commit/727ae4a4de7351b66f45d75f8e83ba419b76344a))
* thin code comments to what the code cannot say itself ([2208ca1](https://github.com/Elia97/astro-template/commit/2208ca1add52c447c9fb96ecfcbf6629c30dd077))
* **workflow:** align the doc set with the estimate that precedes it ([63dd8c6](https://github.com/Elia97/astro-template/commit/63dd8c6d962024bf6e8eee16dda408579eda6f3d))


### Code Refactoring

* **components:** give every child of components/ a role, no loose files ([ae5e739](https://github.com/Elia97/astro-template/commit/ae5e7394c622b2ca9cff8ab4a79fecefb6dd4d17))
* **legal:** drop the placeholder policies for an honest fallback ([721a20e](https://github.com/Elia97/astro-template/commit/721a20ed321160c174f22e076d57eeaff7d65208))
* **legal:** let the page own the layout instead of the component ([a47b2f6](https://github.com/Elia97/astro-template/commit/a47b2f694dcdf3d065e25504d6af84949254e1d8))
* **lib:** file the locale-aware collection reader under content/ ([aa50aad](https://github.com/Elia97/astro-template/commit/aa50aad3dd042d2f486ef5b265580df13a42bbab))
* **lib:** group machinery by domain, keep config and the example flat ([5b0a03a](https://github.com/Elia97/astro-template/commit/5b0a03ab08fdc1a4e7f201cc00cc8c509affe98d))
* **ops:** split the production smoke into checks and a CLI ([bcc1a0a](https://github.com/Elia97/astro-template/commit/bcc1a0a8637fea0112b8edf6eed0db56585b74e0))
* **rendering:** prerender by default and opt out of it explicitly ([a9a8fd7](https://github.com/Elia97/astro-template/commit/a9a8fd7a4d0d6c904b1b07b9b46c6f208c460c96))
* **scripts:** translate the two remaining Italian scripts ([b607170](https://github.com/Elia97/astro-template/commit/b6071707d511d30431eba7009d7475b3f07a4761))
* **styles:** name the arbitrary values and drop two dead token pairs ([6d471ae](https://github.com/Elia97/astro-template/commit/6d471aebecade8844c9f90e298bd367a5ad222e2))
* sweep the files the CSP branch held back ([ba7a85b](https://github.com/Elia97/astro-template/commit/ba7a85b5f1000795835a5ff1988de4ae1302ed63))

## Changelog
