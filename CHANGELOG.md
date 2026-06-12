# [1.14.0](https://github.com/ejpespa/gtypee/compare/v1.13.0...v1.14.0) (2026-06-12)


### Features

* add recover deleted user command and report deleted-users ([2ec1a6c](https://github.com/ejpespa/gtypee/commit/2ec1a6c98977845f4457854827f03e8cac4f5759))

# [1.13.0](https://github.com/ejpespa/gtypee/compare/v1.12.0...v1.13.0) (2026-05-21)


### Features

* add --fail-on-empty flag — exit 7 when list commands return no results ([b1e9bc9](https://github.com/ejpespa/gtypee/commit/b1e9bc9a9d84fd8fa80010951ad95e7259e3108d))
* add --quiet flag and stderr helper for CI/CD pipelines ([2fa61be](https://github.com/ejpespa/gtypee/commit/2fa61be4df7779d21e97c1247720ce871f1eb010))
* add --timeout flag — whole-command deadline with exit code 5 ([8746cc5](https://github.com/ejpespa/gtypee/commit/8746cc5b723d6c77b4a4fed549b78641545ea78d))
* add health-check command — verify auth and API connectivity ([f4bfac6](https://github.com/ejpespa/gtypee/commit/f4bfac682112fa97ff77a7d193448aa718c01ba8))
* deepen Gmail/Drive/Calendar services, add Meet, CSV output, chat DM, whoami enrichment, help examples ([e3cdd3e](https://github.com/ejpespa/gtypee/commit/e3cdd3e7365b1c975cdcf2fa3a2eef20c073b4ce))
* expand exit codes — auth (3), rate-limit (4), timeout (5), not-found (6), empty (7) ([0714dc9](https://github.com/ejpespa/gtypee/commit/0714dc949fff5c1df55643fc88218c7495d9c3f0))

# [1.12.0](https://github.com/ejpespa/gtypee/compare/v1.11.0...v1.12.0) (2026-05-21)


### Features

* **workspace:** add --never flag to user inactive command ([fa68960](https://github.com/ejpespa/gtypee/commit/fa689606b50c28ab5d8eb7464af6eac4c207aa2b))
* **workspace:** add user inactive command to list users with no recent login ([236b165](https://github.com/ejpespa/gtypee/commit/236b165ccf20a826e119ca9acbdd584f3a29cb3a))

# [1.11.0](https://github.com/ejpespa/gtypee/compare/v1.10.2...v1.11.0) (2026-05-13)


### Bug Fixes

* correct program name, VERSION, desire-path wiring, JSON transforms, and error handling ([dbb490b](https://github.com/ejpespa/gtypee/commit/dbb490b1e52c6bb4f3fcb27a1fcb178dcbab20a4))


### Features

* add gmail reply and drive export commands ([2fe65c7](https://github.com/ejpespa/gtypee/commit/2fe65c729144d5e7d0528689e75892c31d287035))

## [1.10.2](https://github.com/ejpespa/gtypee/compare/v1.10.1...v1.10.2) (2026-04-21)


### Bug Fixes

* **gmail:** show full message body in thread get command ([aa4afb6](https://github.com/ejpespa/gtypee/commit/aa4afb61aa3fb0812f995bb56a0022604d5c1f54))

## [1.10.1](https://github.com/ejpespa/gtypee/compare/v1.10.0...v1.10.1) (2026-04-13)


### Bug Fixes

* **gmail:** correctly join output directory with filename when downloading attachments ([a3cb899](https://github.com/ejpespa/gtypee/commit/a3cb899d25b715752fedabae10e9774b04797c63))

# [1.10.0](https://github.com/ejpespa/gtypee/compare/v1.9.0...v1.10.0) (2026-04-02)


### Features

* **workspace:** add domain migration helper commands ([e55d9ce](https://github.com/ejpespa/gtypee/commit/e55d9ce40a52886e7c8740d89d40d63df80f6c00))

# [1.9.0](https://github.com/ejpespa/gtypee/compare/v1.8.0...v1.9.0) (2026-03-24)


### Features

* **sheets:** add share command for spreadsheet permissions ([bba7405](https://github.com/ejpespa/gtypee/commit/bba7405b0d0d631fcfa9d98142af8e825f40682d))

# [1.8.0](https://github.com/ejpespa/gtypee/compare/v1.7.0...v1.8.0) (2026-03-20)


### Features

* **gmail:** add bulk attachment download commands ([7ddd399](https://github.com/ejpespa/gtypee/commit/7ddd399ae77682ff5c306fbfe0e67f4abfa4e06e))

# [1.7.0](https://github.com/ejpespa/gtypee/compare/v1.6.0...v1.7.0) (2026-03-12)


### Features

* **gmail:** add attachment download command ([2646780](https://github.com/ejpespa/gtypee/commit/2646780929398d117fc7d909ad15afa3f4174f57))

# [1.6.0](https://github.com/ejpespa/gtypee/compare/v1.5.1...v1.6.0) (2026-03-12)


### Features

* **gmail:** display attachments in get command ([36a1f16](https://github.com/ejpespa/gtypee/commit/36a1f1624eac113ff739cddce8ed77eacfd7c94c))

## [1.5.1](https://github.com/ejpespa/gtypee/compare/v1.5.0...v1.5.1) (2026-03-12)


### Bug Fixes

* **gmail:** improve body extraction for nested multipart emails ([2944410](https://github.com/ejpespa/gtypee/commit/2944410629b0c3cf451389b572f76085a96db03f))

# [1.5.0](https://github.com/ejpespa/gtypee/compare/v1.4.0...v1.5.0) (2026-03-12)


### Bug Fixes

* trigger release v1.4.1 ([f249036](https://github.com/ejpespa/gtypee/commit/f2490362ba3f3fed7e3b456b15f12766b60bc81f))


### Features

* **gmail:** add senders command to extract unique sender emails ([f3fa28c](https://github.com/ejpespa/gtypee/commit/f3fa28c60253cce20e6ebe0ea673c6be53cffd78))
* trigger new release v1.4.1 ([5643cdb](https://github.com/ejpespa/gtypee/commit/5643cdbd7e705dbe6dfecdef4b1e244b33d5cf48))

# [1.3.0](https://github.com/ejpespa/gtypee/compare/v1.2.0...v1.3.0) (2026-03-02)


### Features

* **gmail:** add --query option to list command ([4b72fb4](https://github.com/ejpespa/gtypee/commit/4b72fb4dfd64737db3bb5bf58e3759b1d1e04149))

# [1.2.0](https://github.com/ejpespa/gtypee/compare/v1.1.0...v1.2.0) (2026-02-28)


### Features

* **docs:** add export command ([39e63a3](https://github.com/ejpespa/gtypee/commit/39e63a3861e9e17d045876863d5aed1644b78c29))
* **docs:** add export types ([7d8ef82](https://github.com/ejpespa/gtypee/commit/7d8ef82e52a504421246abdc01693b91a4fff390))
* **docs:** add formatDocsList function ([20f3d81](https://github.com/ejpespa/gtypee/commit/20f3d81c5c3b803057799f880952cde1f28bcd83))
* **docs:** add list command with pagination support ([663d554](https://github.com/ejpespa/gtypee/commit/663d554b7ef0b3a95377044f0e7f47dca52be400))
* **docs:** add list types and pagination support ([eda3367](https://github.com/ejpespa/gtypee/commit/eda3367215a448d275e9f2529ba738eb078dfe63))
* **docs:** implement exportDoc runtime function ([1fc4cc3](https://github.com/ejpespa/gtypee/commit/1fc4cc3526fad56e29baeee6ab2ccdcc4f23683e))
* **sheets:** add export command ([71bf8b9](https://github.com/ejpespa/gtypee/commit/71bf8b9712a82cf2010b2c4365707a956b7ad9d1))
* **sheets:** add export types ([c81e6a3](https://github.com/ejpespa/gtypee/commit/c81e6a3532742e8f1782fb369d3d1ac823ad6935))
* **sheets:** add formatSheetsList function ([d921ae2](https://github.com/ejpespa/gtypee/commit/d921ae2b183216da051cf06770c4f12f38b64f7f))
* **sheets:** add list command with pagination support ([3fd8892](https://github.com/ejpespa/gtypee/commit/3fd8892e281ea12985d04364f61aa953c277d001))
* **sheets:** add list types and pagination support ([b3822e3](https://github.com/ejpespa/gtypee/commit/b3822e310b1d46b032ef570bb3228b3dd7624084))
* **sheets:** implement exportSheet runtime function ([4ef34bf](https://github.com/ejpespa/gtypee/commit/4ef34bfebc394055ceff334c1b4c38886ab6b79d))

# [1.1.0](https://github.com/ejpespa/gtypee/compare/v1.0.0...v1.1.0) (2026-02-27)


### Bug Fixes

* add non-null assertions for workspace pagination tests ([94e7e38](https://github.com/ejpespa/gtypee/commit/94e7e38111e20a436ef688325bc45e10792da9e1))


### Features

* add shared pagination types ([ee73377](https://github.com/ejpespa/gtypee/commit/ee73377cd396d94a8e4a397f434755f6d3c1744d))
* **calendar:** add pagination support to events list ([c8f74fd](https://github.com/ejpespa/gtypee/commit/c8f74fdd57555d6e386c5a9c1ca12edfb64c6cc5))
* **contacts:** add pagination support to list command ([3fc8fe4](https://github.com/ejpespa/gtypee/commit/3fc8fe421e4425f310cdbd41b6fd69bff4d5384a))
* **drive:** add pagination support to ls and search commands ([fc2e600](https://github.com/ejpespa/gtypee/commit/fc2e600f87bf4809da49c35d80b5f3ee977ba1ea))
* **gmail:** add pagination support to list commands ([5f79a30](https://github.com/ejpespa/gtypee/commit/5f79a302c54e5979cf2e5f3d54441e6b5bedc21a))
* **workspace:** add pagination support to user, group, device list commands ([dd366e6](https://github.com/ejpespa/gtypee/commit/dd366e6bd04a4e0f5e95bea197656f88ccb56d47))

# 1.0.0 (2026-02-23)


### Bug Fixes

* **ci:** improve release workflow tag fetching and git config ([53b777d](https://github.com/ejpespa/gtypee/commit/53b777d51308ef2af880aad6761d167afbe3e407))
* republish to npm with 2fa bypass token ([80a339c](https://github.com/ejpespa/gtypee/commit/80a339c5f93788b06c9a4539ffae4caaacac7940))
* republish with bypass 2fa token ([187bcb6](https://github.com/ejpespa/gtypee/commit/187bcb64e2686095ed04cb54757076438729f8af))
* update repository URL to correct GitHub repo ([0820e9c](https://github.com/ejpespa/gtypee/commit/0820e9cb87f4299971717f7ee32f7739364062e8))


### Features

* initial release ([41bdd5f](https://github.com/ejpespa/gtypee/commit/41bdd5fbbd2960e59e4981a5dc53269885dfa730))
* initial release ([9c6171a](https://github.com/ejpespa/gtypee/commit/9c6171a377aaa2aeb93d9ce0a15e0ea7129eb72e))
* initial release ([6e5590c](https://github.com/ejpespa/gtypee/commit/6e5590c37f9b83a285cad8d2b9ff1e3310f7043b))
* initial release of gtypee CLI ([8c2bf6d](https://github.com/ejpespa/gtypee/commit/8c2bf6db10f77984776d69555da70901df59ba8a))
* test semantic-release ([394d19c](https://github.com/ejpespa/gtypee/commit/394d19ce6f2bb05ed8a6ec6935845201d2a2650c))

# Changelog

All notable changes to this project will be automatically documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/2.0.0.html).
