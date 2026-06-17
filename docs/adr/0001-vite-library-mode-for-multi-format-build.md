# UMD/CJS/ESM 동시 출력을 위해 Vite 라이브러리 모드 채택

webpack4+babel 빌드를 대체하면서, 소비자가 UMD(`<script>`/CDN), CommonJS(`require`), ESM(`import`) 세 형식을 모두 쓸 수 있어야 한다. Vite 라이브러리 모드(`formats: ['es','umd','cjs']`)는 단일 설정으로 세 형식을 모두 생성하고 `vite-plugin-dts`로 타입까지 낸다.

## Considered Options

- **tsup / unbuild**: 라이브러리 빌드에 더 관용적이고 설정이 짧지만 진짜 UMD 출력이 약하거나 없다(IIFE 글로벌만). UMD가 필수 요구사항이라 탈락.
- **webpack 유지**: 기존 도구지만 TS/ESM 출력 설정이 번거롭고 현대 라이브러리 빌드 흐름과 거리가 있다.

UMD 요구를 버린다면 tsup가 더 단순한 선택이 되므로, 이 결정은 "UMD를 계속 지원한다"는 전제에 묶여 있다.
