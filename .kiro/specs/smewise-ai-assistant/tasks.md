# Implementation Plan: SMEwise AI Assistant

## Overview

Implement the SMEwise web application as a React + Tailwind CSS frontend with a Node.js/Express backend. The backend proxies all AI calls (Anthropic Claude and Amazon Nova Canvas via AWS Bedrock). No authentication is required; business profile data persists in `localStorage`. Implementation proceeds in layers: project scaffolding → data models and utilities → backend API routes → frontend core (profile form, dashboard shell) → each of the five Sections and their Widgets → Owner Tools (Document Generator and Chatbot) → final polish and testing.

---

## Tasks

- [x] 1. Scaffold project structure and configure tooling
  - Create a monorepo with two packages: `client/` (React + Vite + Tailwind CSS) and `server/` (Node.js + Express + TypeScript).
  - Configure `tsconfig.json` for both packages.
  - Add `.env.example` listing `ANTHROPIC_API_KEY`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`.
  - Install dependencies: `react`, `react-dom`, `tailwindcss`, `vite`, `express`, `@anthropic-ai/sdk`, `@aws-sdk/client-bedrock-runtime`, `fast-check` (for property tests), `vitest`, `@testing-library/react`.
  - Configure Tailwind CSS with a dark theme using purple/violet accent colours (`purple-500`, `violet-600` as primary accents, `gray-900`/`gray-950` as backgrounds).
  - _Requirements: 22.1, 22.6_

- [x] 2. Implement shared data models and utility functions
  - [x] 2.1 Define TypeScript interfaces: `BusinessProfile`, `BusinessStage`, `BusinessType`, `PricingOptionalInputs`, `WidgetState`, `WidgetStatus`, `ChatMessage`.
    - Place in `client/src/types/index.ts` and `server/src/types/index.ts` (or a shared `types/` package).
    - _Requirements: 1.2, 11.1, 19.1_

  - [x] 2.2 Implement the RM currency formatter utility.
    - `formatRM(value: number): string` — returns strings like `RM 1,200.00`.
    - _Requirements: 1.3, 7.3, 9.3, 13.3, 15.3, 22.4_

  - [ ]* 2.3 Write property test for RM currency formatter (Property 5).
    - **Property 5: RM currency formatting consistency**
    - **Validates: Requirements 1.3, 7.3, 9.3, 13.3, 15.3, 22.4**
    - Use `fast-check` to generate random positive integers and floats, pass through `formatRM`, assert output matches `/^RM [0-9,]+(\.[0-9]{2})?$/`.
    - Minimum 100 iterations.
    - `// Feature: smewise-ai-assistant, Property 5: RM currency formatting consistency`

  - [x] 2.4 Implement `localStorage` helpers: `saveProfile(profile: BusinessProfile): void` and `loadProfile(): BusinessProfile | null`.
    - Wrap in `try/catch`; on failure, return `null` and emit a console warning.
    - _Requirements: 1.7, 24.1, 24.2, 24.3, 24.4_

  - [ ]* 2.5 Write property test for BusinessProfile localStorage round-trip (Property 1).
    - **Property 1: Business Profile round-trip persistence**
    - **Validates: Requirements 1.7, 24.1, 24.2, 24.4**
    - Use `fast-check` to generate arbitrary `BusinessProfile` objects, call `saveProfile` then `loadProfile`, assert deep equality.
    - Minimum 100 iterations.
    - `// Feature: smewise-ai-assistant, Property 1: Business Profile round-trip persistence`

- [x] 3. Implement backend server foundation
  - [x] 3.1 Create the Express server entry point (`server/src/index.ts`).
    - On startup, validate that `ANTHROPIC_API_KEY`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION` are all present in `process.env`. If any are missing, log a descriptive error and call `process.exit(1)`.
    - Mount CORS middleware (allow `localhost:5173` in development).
    - Mount JSON body parser.
    - _Requirements: 21.1, 21.2, 21.3, 21.4_

  - [x] 3.2 Implement `GET /api/health` route.
    - Returns `{ "status": "ok" }` with HTTP 200 when all env vars are present.
    - _Requirements: 21.4_

  - [x] 3.3 Implement `POST /api/claude/stream` route.
    - Accept `{ systemPrompt, userMessage, temperature, tools, maxTokens }`.
    - Use `@anthropic-ai/sdk` to call `claude-sonnet-4-20250514` with streaming enabled.
    - Forward SSE chunks to the client as `data: {"delta": "..."}` events; send `data: [DONE]` on completion.
    - Enable `web_search` tool when `tools` array includes `"web_search"`.
    - Catch errors and return HTTP 500 with `{ "error": "user-safe message" }`.
    - _Requirements: 20.1, 20.2, 20.3, 20.5_

  - [x] 3.4 Implement `POST /api/claude/complete` route.
    - Same as stream route but returns the full response as `{ "content": "string" }` (non-streaming).
    - Used for Profile Summary Card and Document Generator.
    - _Requirements: 20.2_

  - [x] 3.5 Implement `POST /api/nova/image` route.
    - Accept `{ prompt, width, height }`.
    - Use `@aws-sdk/client-bedrock-runtime` to invoke `amazon.nova-canvas-v1:0`.
    - Return `{ "imageBase64": "string", "mimeType": "image/png" }`.
    - Catch errors and return HTTP 500 with `{ "error": "user-safe message" }`.
    - _Requirements: 8.1, 14.1, 16.1, 17.1_

  - [x] 3.6 Implement `POST /api/document/generate` route.
    - Accept `{ documentType, businessProfile, templateText }`.
    - Call Claude with `betas: ["interleaved-thinking-2025-05-14"]` (Show_Reasoning / extended thinking mode).
    - Return `{ "content": "string", "thinkingSteps": "string | null" }`.
    - _Requirements: 18.3, 18.4, 18.5, 18.6_

- [x] 4. Checkpoint — Backend routes complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement the Business Profile form
  - [x] 5.1 Build the `ProfileForm` component.
    - Render all eight fields: Company Name, Industry, City, Target Customer, Main Goal (optional), Current Funds, Business Stage (dropdown), Business Type (dropdown).
    - Add a tooltip on each field explaining its purpose within SMEwise.
    - _Requirements: 1.1, 1.2, 1.6_

  - [x] 5.2 Implement the `FundsInput` sub-component (slider + numeric input, synchronised).
    - Both controls update a shared state value.
    - Display the value formatted with `formatRM`.
    - Clamp input to range [1000, 999999999].
    - _Requirements: 1.3_

  - [ ]* 5.3 Write property test for funds slider/input synchronisation (Property 2).
    - **Property 2: Funds slider and input synchronisation**
    - **Validates: Requirements 1.3**
    - Use `fast-check` to generate integers in [1000, 999999999], simulate setting slider value, assert numeric input matches; simulate setting numeric input, assert slider position matches.
    - Minimum 100 iterations.
    - `// Feature: smewise-ai-assistant, Property 2: Funds slider and input synchronisation`

  - [x] 5.4 Implement form validation logic.
    - On submit, check all required fields are non-empty. Collect errors per field.
    - Display inline validation error messages beneath each invalid field.
    - Prevent submission if any required field is empty.
    - _Requirements: 1.5_

  - [ ]* 5.5 Write property test for required field validation (Property 3).
    - **Property 3: Required field validation completeness**
    - **Validates: Requirements 1.5**
    - Use `fast-check` to generate `BusinessProfile` objects with random subsets of required fields set to empty string. Assert form rejects submission and error count equals the number of empty required fields.
    - Minimum 100 iterations.
    - `// Feature: smewise-ai-assistant, Property 3: Required field validation completeness`

  - [x] 5.6 Wire form submission: on valid submit, call `saveProfile`, trigger Profile Summary Card generation, and unlock the Dashboard.
    - On page load, call `loadProfile`; if a profile is found, pre-populate the form and unlock the Dashboard immediately.
    - _Requirements: 1.4, 1.7, 1.8, 24.1, 24.2_

- [x] 6. Implement the Profile Summary Card
  - [x] 6.1 Build the `ProfileSummaryCard` component.
    - On valid profile submit, call `POST /api/claude/complete` with the profile summary prompt.
    - Show `LoadingState` (skeleton + contextual message) while generating.
    - Display the generated 4–6 line summary.
    - Show `RegenerateButton` after generation.
    - Show `ErrorState` with retry on API failure.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 7. Implement the Dashboard shell and Section layout
  - [x] 7.1 Build the `Dashboard` component.
    - Render five `SectionPanel` components: Operations, Financial Planning, Pricing Strategy, Marketing, Owner Tools.
    - Sections are locked (greyed out, non-interactive) until a valid profile is submitted.
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 7.2 Build the `SectionPanel` component.
    - Collapsible header (expand/collapse toggle).
    - `GenerateAllButton` at the top of each section that triggers all child Widgets simultaneously.
    - Card-based layout for Widget content.
    - _Requirements: 3.4, 3.5, 3.6, 3.7_

  - [x] 7.3 Build the `WidgetCard` component (reusable shell for all Widgets).
    - Manages `WidgetState` (idle / loading / success / error).
    - Renders `LoadingState`, `WidgetOutput`, `RegenerateButton`, or `ErrorState` based on state.
    - `ErrorState` shows a friendly non-technical message and a `RetryButton`.
    - Handle rate limit (429) and timeout errors with specific friendly messages.
    - _Requirements: 20.6, 20.7, 23.1, 23.2, 23.4, 23.5_

  - [ ]* 7.4 Write property test for Widget error state on API failure (Property 4).
    - **Property 4: Widget error state on API failure**
    - **Validates: Requirements 4.8, 5.6, 6.7, 7.7, 8.6, 9.7, 10.9, 12.7, 13.7, 14.5, 15.8, 16.5, 17.5, 18.10, 19.7, 23.1, 23.2**
    - Use `fast-check` to generate arbitrary widget types and failure modes (network error, 4xx, 5xx, timeout). Assert widget reaches `"error"` status with a non-empty `errorMessage` and retry button rendered.
    - Minimum 100 iterations.
    - `// Feature: smewise-ai-assistant, Property 4: Widget error state on API failure`

- [x] 8. Checkpoint — Core shell complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement Operations Section Widgets
  - [x] 9.1 Implement the Startup Registration Guidelines Widget.
    - Call `POST /api/claude/stream` with `tools: ["web_search"]`.
    - Prompt: checklist format, business structure, capital, licences, SSM/LHDN/EPF/SOCSO fees in RM, processing time, max 200 words, specific to `businessType` and `industry`.
    - Stream response into `WidgetCard`.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [x] 9.2 Implement the Office & Location Finder Widget.
    - Call `POST /api/claude/stream` with `tools: ["web_search"]`.
    - Prompt: workspace recommendations, RM cost breakdowns, negotiation tips, zoning notes, specific to `city` and `industry`, max 200 words.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 9.3 Implement the Risk Analyzer Widget.
    - Call `POST /api/claude/stream` with `temperature: 0.4` and `tools: ["web_search"]`.
    - Prompt: top 5 risks, each with severity level, consequence description, 3-step mitigation plan, specific to `industry`, `businessStage`, `businessType`, max 200 words.
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [x] 10. Implement Financial Planning Section Widgets
  - [x] 10.1 Implement the Fund Allocation Table Widget.
    - Call `POST /api/claude/stream`.
    - Prompt: table with Operations, Marketing, Inventory, Staffing, Technology, Contingency — each with % allocation, key expense examples, rationale; based on `currentFunds` in RM, max 200 words.
    - Render output as a formatted table.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 10.2 Implement the Revenue Projection Visual Widget.
    - Call `POST /api/nova/image`.
    - Prompt: 12-month revenue line graph, RM y-axis, colour-coded phases (Startup, Growth, Scaling, Optimization), context from `currentFunds`, `businessStage`, `industry`.
    - Render returned base64 as `<img>`.
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 10.3 Implement the Financial Return Projection Widget.
    - Call `POST /api/claude/stream`.
    - Prompt: quarterly revenue breakdown, break-even analysis, 3 milestones, 3 risks, 3 action steps; all RM values; based on `currentFunds`, `businessStage`, `industry`; max 200 words.
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

  - [x] 10.4 Implement the Loans & Funding Panel Widget.
    - Call `POST /api/claude/stream` with `tools: ["web_search"]` — two parallel sub-prompts or a single prompt producing two sections.
    - Loan Guide sub-widget: SME Bank, TEKUN, Bank Negara, commercial banks; real URLs, eligibility, RM amounts; max 100 words.
    - Investor & Grants Guide sub-widget: Cradle, MDEC, MIDA, MBAN, MaGIC, pitchIN; real URLs, grant amounts in RM, eligibility; max 100 words.
    - Render as two side-by-side cards.
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9_

- [x] 11. Implement Pricing Strategy Section
  - [x] 11.1 Build the `PricingOptionalInputs` component.
    - Three optional fields: Monthly Revenue Range (dropdown), Product or Service Names (textarea), Cost Per Product (textarea).
    - Store values in component state; pass to all Pricing Widget prompt builders.
    - _Requirements: 11.1, 11.2, 11.3_

  - [x] 11.2 Implement the Competitor Pricing Analysis Widget.
    - Call `POST /api/claude/stream` with `tools: ["web_search"]`.
    - Prompt: market price overview, competitor table (3–4 types), positioning recommendation, market reality check; conversational tone; specific to `industry`, `city`, product names if provided; max 200 words.
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

  - [x] 11.3 Implement the Smart Pricing Suggestions Widget.
    - Call `POST /api/claude/stream` with `tools: ["web_search"]`.
    - Prompt: pricing table per product (cost, recommended price, margin, monthly target), strategy explanation, quick action plan table, revenue path to `mainGoal`; all RM; incorporate `costPerProduct` if provided; max 300 words.
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

  - [x] 11.4 Implement the Product Visual Widget.
    - Call `POST /api/nova/image`.
    - Prompt: professional product/service image using `companyName`, `industry`, product names if provided.
    - Render returned base64 as `<img>`.
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 12. Implement Marketing Section Widgets
  - [x] 12.1 Implement the Marketing Strategy Generator Widget.
    - Call `POST /api/claude/stream` with `tools: ["web_search"]` and `temperature: 0.6`.
    - Prompt: phased plan covering Facebook/Instagram, WhatsApp Business, TikTok, Google My Business, Shopee/Lazada, local events; phase overview + detailed table with RM budget allocation based on `currentFunds`; Malaysia-specific tactics; max 300 words.
    - Store generated strategy text in component state for use by the Marketing Poster Widget.
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8_

  - [x] 12.2 Implement the Marketing Poster Widget.
    - Call `POST /api/nova/image`.
    - Prompt: professional promotional poster using `companyName`, `industry`, `city`, and marketing strategy context if available.
    - Render returned base64 as `<img>`.
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

- [x] 13. Checkpoint — All five Sections complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Implement Owner Tools Section — Analytics Dashboard Visual Widget
  - Call `POST /api/nova/image`.
  - Prompt: minimalist SaaS-style dashboard with bar charts, line graphs, pie charts relevant to `industry` and `niche`.
  - Render returned base64 as `<img>`.
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

- [x] 15. Implement Owner Tools Section — Document Generator Widget
  - [x] 15.1 Build the `DocumentGeneratorWidget` component.
    - Dropdown for document type: Business Plan Summary, SWOT Analysis, Monthly Operations Report, Investor Pitch Outline, Staff Onboarding Checklist, Marketing Brief.
    - Optional file upload field (accept `.txt`, `.docx`, `.pdf`); read file content as text for template reference.
    - Generate button triggers `POST /api/document/generate`.
    - Display generated document content (up to 1,000 words) with clear headings.
    - Show `LoadingState` during generation; show `RegenerateButton` after; show `ErrorState` on failure.
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.8, 18.9, 18.10_

  - [x] 15.2 Implement document download functionality.
    - Provide a download button offering PDF and `.docx` format options.
    - For PDF: use a client-side library such as `jspdf` to render the document content.
    - For `.docx`: use `docx` npm package to generate a Word document from the content string.
    - _Requirements: 18.7_

- [x] 16. Implement Owner Tools Section — Business Chatbot Widget
  - [x] 16.1 Build the `BusinessChatbot` component.
    - Scrollable `MessageHistory` displaying user and assistant messages with timestamps.
    - `MessageInput` text field with send button (also triggered by Enter key).
    - `TypingIndicator` shown while a response is being generated.
    - _Requirements: 19.1, 19.6_

  - [x] 16.2 Wire chatbot to `POST /api/claude/stream`.
    - System prompt includes the full `BusinessProfile` as context.
    - `temperature: 0.5`.
    - Stream response chunks into the latest assistant message bubble.
    - Cap responses at 200 words (enforce via prompt instruction and post-process trim if needed).
    - On API failure, display a friendly error message within the chat interface with a retry option.
    - _Requirements: 19.2, 19.3, 19.4, 19.5, 19.7_

  - [ ]* 16.3 Write property test for chatbot response word cap (Property 6).
    - **Property 6: Chatbot response word cap**
    - **Validates: Requirements 19.3**
    - Use `fast-check` to generate random user messages. Mock the Claude stream to return responses of varying lengths (including over 200 words). Assert that the displayed response contains no more than 200 words.
    - Minimum 100 iterations.
    - `// Feature: smewise-ai-assistant, Property 6: Chatbot response word cap`

- [x] 17. Implement UI theming, responsiveness, and polish
  - [x] 17.1 Apply the Dark_Theme globally.
    - Set `bg-gray-950` as the root background; use `purple-500`/`violet-600` for primary buttons, accents, and active states.
    - Ensure consistent typography (font sizes, weights, line heights) across all components.
    - _Requirements: 22.1, 22.3_

  - [x] 17.2 Implement mobile-responsive layouts.
    - Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`) to adapt layouts from 320px to 1920px.
    - Ensure the Loans & Funding Panel side-by-side cards stack vertically on mobile.
    - Ensure the Dashboard Sections are readable and usable on small screens.
    - _Requirements: 22.2_

  - [x] 17.3 Implement progressive disclosure.
    - Business Profile form is the only visible content on first load.
    - Dashboard and all Sections are hidden until a valid profile is submitted.
    - _Requirements: 22.5_

- [x] 18. Final checkpoint — Full integration and all tests pass
  - Run the full test suite (`vitest --run`).
  - Verify all six correctness properties pass their property-based tests.
  - Verify integration tests for backend routes pass with mocked SDKs.
  - Verify snapshot tests for key components pass.
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 19. Premium UI redesign — apply full design system across all components
  - [ ] 19.1 Configure design tokens and Tailwind theme extension.
    - Add CSS custom properties to `client/src/index.css`: `--bg-app: #0f0d1a`, `--bg-card: #1a1728`, `--bg-input: #221f35`, `--border-default: #3d3660`, `--accent-primary: #7c3aed`, `--accent-highlight: #a78bfa`.
    - Extend `tailwind.config.ts` with these tokens as named colours (`bg-app`, `bg-card`, `bg-input`, `border-default`, `accent-primary`, `accent-highlight`).
    - Set base font size to 15px on `html`/`body`.
    - Add custom CSS for the purple slider thumb with white ring (`input[type=range]::-webkit-slider-thumb`).
    - Add `@keyframes fadeInUp` (opacity 0→1, translateY 16px→0) and `@keyframes progressBar` (width 0→100%) to `index.css`.
    - _Requirements: 22.1, 22.3_

  - [ ] 19.2 Restyle the root layout and global progress bar.
    - Set root `<div>` background to `bg-app` (`#0f0d1a`).
    - Add a `GlobalProgressBar` component: `position: fixed; top: 0; left: 0; height: 4px; background: #7c3aed; z-index: 9999`. Visible when any Widget is in `loading` state (driven by a global loading counter in React context or Zustand).
    - _Requirements: 22.1_

  - [ ] 19.3 Restyle `ProfileForm` and `FundsInput`.
    - Apply 2-column grid layout on `≥ 768px`, 1-column on mobile.
    - All field labels: `text-[11px] uppercase tracking-widest text-[#a78bfa] font-semibold mb-1`.
    - All text inputs and selects: `bg-[#221f35] border border-[#3d3660] rounded-[10px] placeholder-[#6b6890] focus:ring-2 focus:ring-[#7c3aed]/27 transition-all`.
    - Slider thumb: purple with white ring via custom CSS.
    - Submit button: solid purple `bg-[#7c3aed] text-white rounded-[10px]` with inline spinner when submitting.
    - Increase card padding to `p-5`, field gaps to `gap-5`.
    - _Requirements: 1.1, 1.3, 22.2_

  - [ ] 19.4 Restyle `SectionPanel` and `SectionHeader`.
    - Panel: `bg-[#1a1728] rounded-xl border border-[#3d3660] border-l-4 border-l-[#7c3aed] p-5 transition-all duration-200 hover:-translate-y-0.5`.
    - Header: bold section title, clearly separated with `mb-6` bottom margin.
    - `GenerateAllButton`: solid purple primary style.
    - Section gap: `gap-8` between panels.
    - Section unlock stagger animation: each panel gets `style={{ animationDelay: \`${index * 100}ms\` }}` with `fadeInUp` keyframe class applied on unlock.
    - _Requirements: 3.4, 3.5, 22.1, 22.5_

  - [ ] 19.5 Restyle `WidgetCard`, `LoadingState`, `ErrorState`, and `RegenerateButton`.
    - `WidgetCard` AI output area: `border border-[#4c3d8f]` with `box-shadow: inset 0 0 0 1px #4c3d8f` inner glow.
    - `LoadingState`: pulsing skeleton blocks (`animate-pulse bg-[#3d3660]/40 rounded-lg`) sized to match expected content height per widget type.
    - `RegenerateButton`: ghost style — `bg-transparent border border-[#7c3aed] text-[#a78bfa] rounded-[10px] hover:bg-[#7c3aed]/10 transition-all`.
    - `ErrorState` retry button: ghost style matching `RegenerateButton`.
    - All interactive elements: `transition: all 0.2s ease`.
    - _Requirements: 20.6, 20.7, 23.1, 23.2_

  - [ ] 19.6 Implement mobile sticky section tab bar.
    - Render a `SectionTabBar` component fixed to `bottom: 0` on `< 768px` only (hidden on `md:` and above).
    - Five tabs, one per Section, each with an icon and short label.
    - Active tab highlighted with `text-[#a78bfa]` and a top border in `#7c3aed`.
    - Tapping a tab scrolls to and expands the corresponding `SectionPanel`.
    - _Requirements: 22.2_

  - [ ] 19.7 Apply hover lift and transition to all cards.
    - Add `hover:-translate-y-0.5 transition-transform duration-200` to `SectionPanel` and `WidgetCard` wrapper elements.
    - Verify no layout shift occurs on hover for cards inside grid containers.
    - _Requirements: 22.1_

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP build.
- Each task references specific requirements for traceability.
- Checkpoints at tasks 4, 8, 13, and 18 ensure incremental validation.
- Property tests use `fast-check` with a minimum of 100 iterations each.
- All monetary values must use `formatRM` — never format inline.
- API keys must never appear in client-side code or be logged server-side.
- The `claude-sonnet-4-20250514` model must be used for all Claude calls (Requirement 20.2).
