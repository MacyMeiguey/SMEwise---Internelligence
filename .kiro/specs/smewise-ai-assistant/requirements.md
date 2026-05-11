# Requirements Document

## Introduction

SMEwise is an AI-powered Malaysian SME business assistant web application designed for first-time Malaysian SME founders and micro-business owners. The application collects a structured business profile and generates personalised, AI-driven guidance across five core sections: Operations, Financial Planning, Pricing Strategy, Marketing, and Owner Tools. All advice is specific to Malaysian regulations, Ringgit (RM), and local platforms (SSM, LHDN, Shopee, TEKUN, etc.). The application uses Anthropic Claude (claude-sonnet-4-20250514) for text generation and Amazon Nova Canvas via AWS Bedrock for image and chart generation. No authentication is required for MVP; business profile data persists in localStorage.

---

## Glossary

- **SMEwise**: The AI-powered Malaysian SME business assistant web application described in this document.
- **Business_Profile**: The structured set of inputs collected from the user (company name, industry, city, business stage, funds, target customer, goals, business type) that drives all AI-generated content.
- **Profile_Summary_Card**: A 4–6 line AI-generated professional summary of the user's Business_Profile.
- **Claude**: The Anthropic Claude API model `claude-sonnet-4-20250514` used for all AI text generation.
- **Nova_Canvas**: Amazon Nova Canvas accessed via AWS Bedrock, used for all AI image and chart generation.
- **Section**: One of the five main content areas of SMEwise: Operations, Financial Planning, Pricing Strategy, Marketing, or Owner Tools.
- **Widget**: An individual AI-generated panel within a Section.
- **Generate_All**: A button at the top of each Section that triggers all Widgets in that Section simultaneously.
- **Regenerate**: A button displayed after each Widget's AI output that re-triggers generation for that Widget.
- **Document_Generator**: The Owner Tools Widget that produces downloadable structured business documents using Claude.
- **Business_Chatbot**: The Owner Tools Widget providing a full chat interface powered by Claude.
- **Loading_State**: A visible skeleton or spinner with a contextual loading message shown while AI content is being generated.
- **RM**: Malaysian Ringgit, the currency used for all monetary values throughout SMEwise.
- **SSM**: Suruhanjaya Syarikat Malaysia (Companies Commission of Malaysia).
- **LHDN**: Lembaga Hasil Dalam Negeri (Inland Revenue Board of Malaysia).
- **EPF**: Employees Provident Fund (Kumpulan Wang Simpanan Pekerja).
- **SOCSO**: Social Security Organisation (Pertubuhan Keselamatan Sosial).
- **TEKUN**: TEKUN Nasional, a Malaysian micro-financing institution.
- **Cradle**: Cradle Fund Sdn Bhd, a Malaysian early-stage technology company funder.
- **MDEC**: Malaysia Digital Economy Corporation.
- **MIDA**: Malaysian Investment Development Authority.
- **MBAN**: Malaysian Business Angel Network.
- **MaGIC**: Malaysian Global Innovation & Creativity Centre.
- **pitchIN**: A Malaysian equity crowdfunding platform.
- **localStorage**: Browser-native key-value storage used to persist Business_Profile data client-side.
- **Web_Search_Tool**: The Anthropic tool-use capability that enables Claude to perform live web searches during generation.
- **Show_Reasoning**: Claude's extended thinking / reasoning mode used for Document_Generator output.
- **Dark_Theme**: The application's default visual theme using dark backgrounds with purple/violet accent colours.

---

## Requirements

### Requirement 1: Business Profile Collection

**User Story:** As a first-time Malaysian SME founder, I want to fill in a structured business profile form, so that SMEwise can generate personalised, context-aware guidance for my specific business.

#### Acceptance Criteria

1. THE SMEwise SHALL display a Business_Profile form as the first screen before any Section content is accessible.
2. THE Business_Profile form SHALL collect the following fields: Company Name (text, required), Industry or Niche (text, required), City or State (text, required), Target Customer (text, required), Main Business Goal (text, optional), Current Funds (number, RM 1,000 to RM 999,999,999, required), Business Stage (dropdown: Idea Stage / Just Launched / 1–2 Years Operating / Established 3+ Years, required), and Business Type (dropdown: Enterprise / Sdn Bhd / PLT / Sole Proprietorship / Partnership, required).
3. THE Current_Funds field SHALL provide both a slider and a numeric input that remain synchronised, with the value displayed in RM format.
4. WHEN the user submits a valid Business_Profile, THE SMEwise SHALL unlock all five Sections and display them in the main dashboard.
5. IF the user submits the Business_Profile form with any required field empty, THEN THE SMEwise SHALL display an inline validation error for each missing required field and prevent submission.
6. THE Business_Profile form SHALL display a tooltip on each input field explaining what the field is used for within SMEwise.
7. WHEN the user submits a valid Business_Profile, THE SMEwise SHALL save the Business_Profile data to localStorage.
8. WHEN SMEwise loads and localStorage contains a previously saved Business_Profile, THE SMEwise SHALL pre-populate the Business_Profile form with the stored values and unlock all Sections without requiring re-entry.

---

### Requirement 2: Business Profile Summary Card

**User Story:** As a Malaysian SME founder, I want to see a concise AI-generated summary of my business profile, so that I can confirm SMEwise has understood my business context correctly.

#### Acceptance Criteria

1. WHEN the user submits a valid Business_Profile, THE SMEwise SHALL invoke Claude to generate a Profile_Summary_Card.
2. THE Profile_Summary_Card SHALL be 4–6 lines in length, written in a professional tone with minimal emojis, and incorporate all Business_Profile fields.
3. WHILE the Profile_Summary_Card is being generated, THE SMEwise SHALL display a Loading_State in the Profile_Summary_Card area.
4. WHEN the Profile_Summary_Card has been generated, THE SMEwise SHALL display a Regenerate button beneath the card.
5. WHEN the user clicks the Regenerate button on the Profile_Summary_Card, THE SMEwise SHALL invoke Claude again to produce a new Profile_Summary_Card.
6. IF the Claude API call for the Profile_Summary_Card fails, THEN THE SMEwise SHALL display a friendly error message with a retry option in the Profile_Summary_Card area.

---

### Requirement 3: Section Navigation and Layout

**User Story:** As a Malaysian SME founder, I want to navigate between the five guidance sections easily, so that I can access the specific type of advice I need at any time.

#### Acceptance Criteria

1. THE SMEwise SHALL display five Sections in the dashboard: Operations, Financial Planning, Pricing Strategy, Marketing, and Owner Tools.
2. WHILE the Business_Profile has not been submitted, THE SMEwise SHALL display all Sections in a locked/disabled state.
3. WHEN the user submits a valid Business_Profile, THE SMEwise SHALL unlock all five Sections simultaneously.
4. THE SMEwise SHALL render each Section with a collapsible header that the user can expand or collapse.
5. THE SMEwise SHALL display a Generate_All button at the top of each Section.
6. WHEN the user clicks the Generate_All button for a Section, THE SMEwise SHALL trigger all Widgets within that Section simultaneously.
7. THE SMEwise SHALL use a card-based layout with clear visual hierarchy for all Widget content within each Section.

---

### Requirement 4: Operations Section — Startup Registration Guidelines Widget

**User Story:** As a first-time Malaysian SME founder, I want AI-generated startup registration guidance, so that I understand the legal steps, costs, and timelines for registering my business in Malaysia.

#### Acceptance Criteria

1. WHEN the user triggers the Startup Registration Guidelines Widget, THE SMEwise SHALL invoke Claude with the Web_Search_Tool enabled to generate registration guidance.
2. THE Startup_Registration_Widget SHALL produce output in checklist format covering: business structure selection, minimum capital requirements, required licences, government fees in RM, and estimated processing time.
3. THE Startup_Registration_Widget output SHALL reference SSM, LHDN, EPF, and SOCSO where applicable.
4. THE Startup_Registration_Widget output SHALL be a maximum of 200 words.
5. THE Startup_Registration_Widget output SHALL be specific to the user's Business_Type and Industry fields from the Business_Profile.
6. WHILE the Startup Registration Guidelines Widget is generating, THE SMEwise SHALL display a Loading_State with a contextual loading message.
7. WHEN the Startup Registration Guidelines Widget output is displayed, THE SMEwise SHALL show a Regenerate button.
8. IF the Claude API call for the Startup Registration Guidelines Widget fails, THEN THE SMEwise SHALL display a friendly error message with a retry option.

---

### Requirement 5: Operations Section — Office & Location Finder Widget

**User Story:** As a Malaysian SME founder, I want AI-generated workspace recommendations for my city, so that I can find a suitable and affordable office or workspace location.

#### Acceptance Criteria

1. WHEN the user triggers the Office & Location Finder Widget, THE SMEwise SHALL invoke Claude with the Web_Search_Tool enabled to generate workspace recommendations.
2. THE Office_Location_Widget output SHALL include workspace recommendations with cost breakdowns in RM, negotiation tips, and zoning or permit notes relevant to the user's City or State and Industry.
3. THE Office_Location_Widget output SHALL be a maximum of 200 words.
4. WHILE the Office & Location Finder Widget is generating, THE SMEwise SHALL display a Loading_State with a contextual loading message.
5. WHEN the Office & Location Finder Widget output is displayed, THE SMEwise SHALL show a Regenerate button.
6. IF the Claude API call for the Office & Location Finder Widget fails, THEN THE SMEwise SHALL display a friendly error message with a retry option.

---

### Requirement 6: Operations Section — Risk Analyzer Widget

**User Story:** As a Malaysian SME founder, I want an AI-generated risk analysis for my business, so that I can proactively identify and mitigate the top threats to my business.

#### Acceptance Criteria

1. WHEN the user triggers the Risk Analyzer Widget, THE SMEwise SHALL invoke Claude at temperature 0.4 with the Web_Search_Tool enabled to generate a risk analysis.
2. THE Risk_Analyzer_Widget output SHALL identify the top 5 business risks, each with a severity level, a description of the consequence, and a 3-step mitigation plan.
3. THE Risk_Analyzer_Widget output SHALL be a maximum of 200 words.
4. THE Risk_Analyzer_Widget output SHALL be specific to the user's Industry, Business_Stage, and Business_Type from the Business_Profile.
5. WHILE the Risk Analyzer Widget is generating, THE SMEwise SHALL display a Loading_State with a contextual loading message.
6. WHEN the Risk Analyzer Widget output is displayed, THE SMEwise SHALL show a Regenerate button.
7. IF the Claude API call for the Risk Analyzer Widget fails, THEN THE SMEwise SHALL display a friendly error message with a retry option.

---

### Requirement 7: Financial Planning Section — Fund Allocation Table Widget

**User Story:** As a Malaysian SME founder, I want an AI-generated budget breakdown for my available funds, so that I can allocate my capital effectively across key business areas.

#### Acceptance Criteria

1. WHEN the user triggers the Fund Allocation Table Widget, THE SMEwise SHALL invoke Claude to generate a budget breakdown table.
2. THE Fund_Allocation_Widget output SHALL present a table with the following categories: Operations, Marketing, Inventory, Staffing, Technology, and Contingency, each with a percentage allocation, key expense examples, and a rationale.
3. THE Fund_Allocation_Widget output SHALL be based on the user's Current_Funds value from the Business_Profile and display all monetary values in RM.
4. THE Fund_Allocation_Widget output SHALL be a maximum of 200 words.
5. WHILE the Fund Allocation Table Widget is generating, THE SMEwise SHALL display a Loading_State with a contextual loading message.
6. WHEN the Fund Allocation Table Widget output is displayed, THE SMEwise SHALL show a Regenerate button.
7. IF the Claude API call for the Fund Allocation Table Widget fails, THEN THE SMEwise SHALL display a friendly error message with a retry option.

---

### Requirement 8: Financial Planning Section — Revenue Projection Visual Widget

**User Story:** As a Malaysian SME founder, I want a visual 12-month revenue projection chart, so that I can understand my expected financial trajectory and growth phases.

#### Acceptance Criteria

1. WHEN the user triggers the Revenue Projection Visual Widget, THE SMEwise SHALL invoke Nova_Canvas via AWS Bedrock to generate a 12-month revenue line graph.
2. THE Revenue_Projection_Widget image SHALL display a RM-denominated y-axis, a 12-month x-axis, and colour-coded growth phases labelled: Startup, Growth, Scaling, and Optimization.
3. THE Revenue_Projection_Widget image SHALL be generated using context from the user's Current_Funds, Business_Stage, and Industry fields.
4. WHILE the Revenue Projection Visual Widget is generating, THE SMEwise SHALL display a Loading_State with a contextual loading message.
5. WHEN the Revenue Projection Visual Widget image is displayed, THE SMEwise SHALL show a Regenerate button.
6. IF the Nova_Canvas API call for the Revenue Projection Visual Widget fails, THEN THE SMEwise SHALL display a friendly error message with a retry option.

---

### Requirement 9: Financial Planning Section — Financial Return Projection Widget

**User Story:** As a Malaysian SME founder, I want an AI-generated financial return projection, so that I can plan for break-even, quarterly milestones, and key financial risks.

#### Acceptance Criteria

1. WHEN the user triggers the Financial Return Projection Widget, THE SMEwise SHALL invoke Claude to generate a financial return projection.
2. THE Financial_Return_Widget output SHALL include: a quarterly revenue breakdown, a break-even analysis, 3 financial milestones, 3 financial risks, and 3 action steps.
3. THE Financial_Return_Widget output SHALL display all monetary values in RM and be based on the user's Current_Funds, Business_Stage, and Industry.
4. THE Financial_Return_Widget output SHALL be a maximum of 200 words.
5. WHILE the Financial Return Projection Widget is generating, THE SMEwise SHALL display a Loading_State with a contextual loading message.
6. WHEN the Financial Return Projection Widget output is displayed, THE SMEwise SHALL show a Regenerate button.
7. IF the Claude API call for the Financial Return Projection Widget fails, THEN THE SMEwise SHALL display a friendly error message with a retry option.

---

### Requirement 10: Financial Planning Section — Loans & Funding Panel Widget

**User Story:** As a Malaysian SME founder, I want an AI-generated guide to Malaysian loans and funding sources, so that I can identify the most relevant financing options for my business.

#### Acceptance Criteria

1. WHEN the user triggers the Loans & Funding Panel Widget, THE SMEwise SHALL invoke Claude with the Web_Search_Tool enabled to generate two side-by-side sub-widgets.
2. THE Loan_Guide sub-widget SHALL cover SME Bank, TEKUN, Bank Negara, and major commercial banks, including real URLs verified via web search, eligibility criteria, and loan amounts in RM.
3. THE Investor_Grants_Guide sub-widget SHALL cover Cradle, MDEC, MIDA, MBAN, MaGIC, and pitchIN, including real URLs verified via web search, grant amounts in RM, and eligibility criteria.
4. THE Loan_Guide sub-widget output SHALL be a maximum of 100 words.
5. THE Investor_Grants_Guide sub-widget output SHALL be a maximum of 100 words.
6. THE Loans_Funding_Widget output SHALL be specific to the user's Business_Stage, Business_Type, and Industry from the Business_Profile.
7. WHILE the Loans & Funding Panel Widget is generating, THE SMEwise SHALL display a Loading_State with a contextual loading message.
8. WHEN the Loans & Funding Panel Widget output is displayed, THE SMEwise SHALL show a Regenerate button.
9. IF the Claude API call for the Loans & Funding Panel Widget fails, THEN THE SMEwise SHALL display a friendly error message with a retry option.

---

### Requirement 11: Pricing Strategy Section — Optional Inputs

**User Story:** As a Malaysian SME founder, I want to optionally provide pricing-specific details, so that the pricing guidance is more accurate and relevant to my actual products or services.

#### Acceptance Criteria

1. THE Pricing_Strategy_Section SHALL display three optional input fields before Widget generation: Monthly Revenue Range (dropdown), Product or Service Names (textarea), and Cost Per Product (textarea).
2. WHEN the user provides values in the optional Pricing_Strategy inputs, THE SMEwise SHALL include those values in the Claude prompts for all Pricing Strategy Widgets.
3. WHEN the user does not provide values in the optional Pricing_Strategy inputs, THE SMEwise SHALL generate Pricing Strategy Widget content using only the Business_Profile data.

---

### Requirement 12: Pricing Strategy Section — Competitor Pricing Analysis Widget

**User Story:** As a Malaysian SME founder, I want an AI-generated competitor pricing analysis, so that I can understand the market price landscape and position my offerings competitively.

#### Acceptance Criteria

1. WHEN the user triggers the Competitor Pricing Analysis Widget, THE SMEwise SHALL invoke Claude with the Web_Search_Tool enabled to generate a competitor pricing analysis.
2. THE Competitor_Pricing_Widget output SHALL include: a market price overview, a competitor table with 3–4 competitor types, a positioning recommendation, and a market reality check.
3. THE Competitor_Pricing_Widget output SHALL be written in a conversational tone and be a maximum of 200 words.
4. THE Competitor_Pricing_Widget output SHALL be specific to the user's Industry, City or State, and any provided Product or Service Names.
5. WHILE the Competitor Pricing Analysis Widget is generating, THE SMEwise SHALL display a Loading_State with a contextual loading message.
6. WHEN the Competitor Pricing Analysis Widget output is displayed, THE SMEwise SHALL show a Regenerate button.
7. IF the Claude API call for the Competitor Pricing Analysis Widget fails, THEN THE SMEwise SHALL display a friendly error message with a retry option.

---

### Requirement 13: Pricing Strategy Section — Smart Pricing Suggestions Widget

**User Story:** As a Malaysian SME founder, I want AI-generated smart pricing recommendations for my products or services, so that I can set prices that are competitive, profitable, and aligned with my revenue goals.

#### Acceptance Criteria

1. WHEN the user triggers the Smart Pricing Suggestions Widget, THE SMEwise SHALL invoke Claude with the Web_Search_Tool enabled to generate pricing recommendations.
2. THE Smart_Pricing_Widget output SHALL include: a pricing table per product or service showing cost, recommended price, margin, and monthly target; a strategy explanation; a quick action plan table; and a revenue path to the user's Main Business Goal.
3. THE Smart_Pricing_Widget output SHALL display all monetary values in RM and be a maximum of 300 words.
4. THE Smart_Pricing_Widget output SHALL incorporate the user's Cost Per Product input if provided.
5. WHILE the Smart Pricing Suggestions Widget is generating, THE SMEwise SHALL display a Loading_State with a contextual loading message.
6. WHEN the Smart Pricing Suggestions Widget output is displayed, THE SMEwise SHALL show a Regenerate button.
7. IF the Claude API call for the Smart Pricing Suggestions Widget fails, THEN THE SMEwise SHALL display a friendly error message with a retry option.

---

### Requirement 14: Pricing Strategy Section — Product Visual Widget

**User Story:** As a Malaysian SME founder, I want an AI-generated product or service image, so that I can visualise how my offering might be presented professionally.

#### Acceptance Criteria

1. WHEN the user triggers the Product Visual Widget, THE SMEwise SHALL invoke Nova_Canvas via AWS Bedrock to generate a professional product or service image.
2. THE Product_Visual_Widget image SHALL be generated using the user's Company Name, Industry, and Product or Service Names as generation context.
3. WHILE the Product Visual Widget is generating, THE SMEwise SHALL display a Loading_State with a contextual loading message.
4. WHEN the Product Visual Widget image is displayed, THE SMEwise SHALL show a Regenerate button.
5. IF the Nova_Canvas API call for the Product Visual Widget fails, THEN THE SMEwise SHALL display a friendly error message with a retry option.

---

### Requirement 15: Marketing Section — Marketing Strategy Generator Widget

**User Story:** As a Malaysian SME founder, I want an AI-generated phased marketing plan, so that I can execute a structured, budget-appropriate marketing strategy using Malaysian platforms and tactics.

#### Acceptance Criteria

1. WHEN the user triggers the Marketing Strategy Generator Widget, THE SMEwise SHALL invoke Claude with the Web_Search_Tool enabled at temperature 0.6 to generate a phased marketing plan.
2. THE Marketing_Strategy_Widget output SHALL cover the following channels: Facebook and Instagram, WhatsApp Business, TikTok, Google My Business, Shopee and Lazada, and local events.
3. THE Marketing_Strategy_Widget output SHALL be structured as a phase overview followed by a detailed table with budget allocation in RM based on the user's Current_Funds.
4. THE Marketing_Strategy_Widget output SHALL include Malaysia-specific tactics and cultural context.
5. THE Marketing_Strategy_Widget output SHALL be a maximum of 300 words.
6. WHILE the Marketing Strategy Generator Widget is generating, THE SMEwise SHALL display a Loading_State with a contextual loading message.
7. WHEN the Marketing Strategy Generator Widget output is displayed, THE SMEwise SHALL show a Regenerate button.
8. IF the Claude API call for the Marketing Strategy Generator Widget fails, THEN THE SMEwise SHALL display a friendly error message with a retry option.

---

### Requirement 16: Marketing Section — Marketing Poster Widget

**User Story:** As a Malaysian SME founder, I want an AI-generated promotional poster for my business, so that I have a ready-to-use visual asset for my marketing campaigns.

#### Acceptance Criteria

1. WHEN the user triggers the Marketing Poster Widget, THE SMEwise SHALL invoke Nova_Canvas via AWS Bedrock to generate a professional promotional poster.
2. THE Marketing_Poster_Widget image SHALL be generated using the user's Company Name, Industry, City or State, and the marketing strategy context from the Marketing Strategy Generator Widget if it has already been generated.
3. WHILE the Marketing Poster Widget is generating, THE SMEwise SHALL display a Loading_State with a contextual loading message.
4. WHEN the Marketing Poster Widget image is displayed, THE SMEwise SHALL show a Regenerate button.
5. IF the Nova_Canvas API call for the Marketing Poster Widget fails, THEN THE SMEwise SHALL display a friendly error message with a retry option.

---

### Requirement 17: Owner Tools Section — Analytics Dashboard Visual Widget

**User Story:** As a Malaysian SME founder, I want an AI-generated analytics dashboard visualisation, so that I can see what a data-driven business dashboard relevant to my industry might look like.

#### Acceptance Criteria

1. WHEN the user triggers the Analytics Dashboard Visual Widget, THE SMEwise SHALL invoke Nova_Canvas via AWS Bedrock to generate a minimalist SaaS-style dashboard visualisation.
2. THE Analytics_Dashboard_Widget image SHALL include bar charts, line graphs, and pie charts relevant to the user's Industry and Niche.
3. WHILE the Analytics Dashboard Visual Widget is generating, THE SMEwise SHALL display a Loading_State with a contextual loading message.
4. WHEN the Analytics Dashboard Visual Widget image is displayed, THE SMEwise SHALL show a Regenerate button.
5. IF the Nova_Canvas API call for the Analytics Dashboard Visual Widget fails, THEN THE SMEwise SHALL display a friendly error message with a retry option.

---

### Requirement 18: Owner Tools Section — Document Generator Widget

**User Story:** As a Malaysian SME founder, I want to generate and download structured business documents, so that I have professional documentation ready for investors, staff, or operational use.

#### Acceptance Criteria

1. THE Document_Generator_Widget SHALL display a dropdown allowing the user to select one of the following document types: Business Plan Summary, SWOT Analysis, Monthly Operations Report, Investor Pitch Outline, Staff Onboarding Checklist, and Marketing Brief.
2. THE Document_Generator_Widget SHALL display an optional file upload field for the user to provide a template reference document.
3. WHEN the user selects a document type and triggers generation, THE SMEwise SHALL invoke Claude using Show_Reasoning mode to generate the full document.
4. THE Document_Generator_Widget output SHALL be a maximum of 1,000 words, clean, and structured with clear headings.
5. THE Document_Generator_Widget output SHALL incorporate the user's full Business_Profile and any uploaded template reference.
6. THE Document_Generator_Widget output SHALL be specific to Malaysian business context, regulations, and terminology.
7. THE SMEwise SHALL provide a download option for the generated document in PDF or .docx format.
8. WHILE the Document Generator Widget is generating, THE SMEwise SHALL display a Loading_State with a contextual loading message.
9. WHEN the Document Generator Widget output is displayed, THE SMEwise SHALL show a Regenerate button.
10. IF the Claude API call for the Document Generator Widget fails, THEN THE SMEwise SHALL display a friendly error message with a retry option.

---

### Requirement 19: Owner Tools Section — Personalised Business Chatbot Widget

**User Story:** As a Malaysian SME founder, I want a personalised AI chatbot that already knows my business, so that I can ask specific questions and get practical, context-aware advice without re-explaining my situation.

#### Acceptance Criteria

1. THE Business_Chatbot_Widget SHALL display a full chat interface with a message input field and a scrollable message history.
2. WHEN the user sends a message, THE SMEwise SHALL invoke Claude at temperature 0.5 with a system prompt that includes the user's full Business_Profile as context.
3. THE Business_Chatbot_Widget responses SHALL be capped at 200 words per reply.
4. THE Business_Chatbot_Widget responses SHALL be written in a friendly, practical tone with Malaysian business context awareness.
5. THE Business_Chatbot_Widget SHALL stream Claude responses to the chat interface as they are generated.
6. WHILE a chatbot response is being generated, THE SMEwise SHALL display a typing indicator in the chat interface.
7. IF the Claude API call for the Business_Chatbot_Widget fails, THEN THE SMEwise SHALL display a friendly error message within the chat interface with a retry option.

---

### Requirement 20: AI Generation — Streaming and Response Quality

**User Story:** As a Malaysian SME founder, I want AI-generated content to appear progressively and be high quality, so that I have a smooth experience and receive accurate, Malaysia-specific guidance.

#### Acceptance Criteria

1. THE SMEwise SHALL stream Claude text responses where technically supported, displaying content progressively as it is generated.
2. THE SMEwise SHALL use model `claude-sonnet-4-20250514` for all Claude API calls.
3. THE SMEwise SHALL enable the Web_Search_Tool for the following Widgets: Startup Registration Guidelines, Office & Location Finder, Risk Analyzer, Competitor Pricing Analysis, Smart Pricing Suggestions, Marketing Strategy Generator, Loan Guide, and Investor & Grants Guide.
4. THE SMEwise SHALL ensure all Claude prompts include explicit instructions to use Malaysian context, RM currency, and references to Malaysian platforms and regulations.
5. THE SMEwise SHALL instruct Claude via system prompt to use the Web_Search_Tool to verify URLs before including them in any output, and to omit URLs that cannot be verified.
6. WHEN any AI generation call is in progress, THE SMEwise SHALL display a Loading_State with a contextual loading message relevant to the Widget being generated.
7. WHEN any AI generation call completes successfully, THE SMEwise SHALL display a Regenerate button for that Widget.

---

### Requirement 21: API Key Management

**User Story:** As a developer deploying SMEwise, I want API keys managed via environment variables, so that credentials are never hardcoded in the codebase and remain secure.

#### Acceptance Criteria

1. THE SMEwise backend SHALL read the Anthropic API key exclusively from an environment variable named `ANTHROPIC_API_KEY`.
2. THE SMEwise backend SHALL read AWS credentials for Bedrock (Nova_Canvas) exclusively from environment variables: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION`.
3. THE SMEwise SHALL never expose API keys or AWS credentials to the client-side browser environment.
4. IF any required environment variable is missing at startup, THEN THE SMEwise backend SHALL log a descriptive error message and refuse to start.

---

### Requirement 22: UI Design and Theming

**User Story:** As a Malaysian SME founder, I want a professional, modern, and mobile-friendly interface, so that SMEwise is pleasant and easy to use on any device.

#### Acceptance Criteria

1. THE SMEwise SHALL apply a Dark_Theme as the default and only visual theme, using dark backgrounds with purple and violet accent colours.
2. THE SMEwise SHALL be fully mobile-responsive, with layouts adapting correctly to screen widths from 320px to 1920px.
3. THE SMEwise SHALL use a clean dashboard aesthetic consistent with Notion and Stripe design conventions, including clear typography, generous whitespace, and consistent component styling.
4. THE SMEwise SHALL display all monetary values throughout the application in Malaysian Ringgit (RM) format.
5. THE SMEwise SHALL use progressive disclosure: the Business_Profile form is presented first, and Section content is only revealed after a valid Business_Profile is submitted.
6. THE SMEwise SHALL use React as the frontend framework and Tailwind CSS for styling.

---

### Requirement 23: Error Handling and Resilience

**User Story:** As a Malaysian SME founder, I want clear and friendly error messages when something goes wrong, so that I understand what happened and know how to recover.

#### Acceptance Criteria

1. IF any Claude API call fails, THEN THE SMEwise SHALL display a friendly, non-technical error message in the affected Widget area with a visible retry button.
2. IF any Nova_Canvas API call fails, THEN THE SMEwise SHALL display a friendly, non-technical error message in the affected Widget area with a visible retry button.
3. IF the localStorage read or write operation fails, THEN THE SMEwise SHALL continue to function without persisting data and display a non-blocking informational message to the user.
4. THE SMEwise SHALL handle API rate limit responses by displaying a friendly message indicating the service is busy and prompting the user to retry after a short delay.
5. THE SMEwise SHALL handle network timeout errors by displaying a friendly message and offering a retry option.

---

### Requirement 24: Data Persistence

**User Story:** As a Malaysian SME founder, I want my business profile to be saved automatically, so that I do not have to re-enter my details every time I return to SMEwise.

#### Acceptance Criteria

1. WHEN the user submits a valid Business_Profile, THE SMEwise SHALL save the complete Business_Profile to localStorage under a defined key.
2. WHEN SMEwise loads in the browser, THE SMEwise SHALL check localStorage for a saved Business_Profile and, if found, restore it to the form and unlock all Sections.
3. THE SMEwise SHALL NOT require any server-side database or authentication for MVP data persistence.
4. WHEN the user modifies and resubmits the Business_Profile form, THE SMEwise SHALL overwrite the previously saved Business_Profile in localStorage with the updated values.
