# Navixa Architecture Diagram

## System Architecture Overview

```mermaid
graph TB
    subgraph "Client Layer"
        UI[React UI Components]
        Pages[Next.js Pages]
        State[Client State Management]
    end

    subgraph "Application Layer"
        Router[Next.js App Router]
        Middleware[Middleware Layer]
        SSR[Server-Side Rendering]
    end

    subgraph "API Layer"
        APIRoutes[Next.js API Routes]
        JobsAPI[/api/jobs]
        GeminiAPI[/api/gemini]
        OllamaAPI[/api/ollama]
    end

    subgraph "External Services"
        Remotive[Remotive Jobs API]
        GoogleAI[Google Gemini API]
        LocalAI[Ollama Local AI]
    end

    subgraph "Data Processing"
        JobProcessor[Job Data Processor]
        TrendAnalyzer[Trend Analyzer]
        AIResponseHandler[AI Response Handler]
    end

    UI --> Router
    Pages --> Router
    State --> UI
    Router --> APIRoutes
    SSR --> Pages
    
    APIRoutes --> JobsAPI
    APIRoutes --> GeminiAPI
    APIRoutes --> OllamaAPI
    
    JobsAPI --> JobProcessor
    JobsAPI --> TrendAnalyzer
    GeminiAPI --> AIResponseHandler
    OllamaAPI --> AIResponseHandler
    
    JobProcessor --> Remotive
    AIResponseHandler --> GoogleAI
    AIResponseHandler --> LocalAI
    TrendAnalyzer --> JobProcessor

    classDef clientLayer fill:#3b82f6,stroke:#1e40af,color:#fff
    classDef appLayer fill:#8b5cf6,stroke:#7c3aed,color:#fff
    classDef apiLayer fill:#10b981,stroke:#059669,color:#fff
    classDef externalLayer fill:#f59e0b,stroke:#d97706,color:#fff
    classDef dataLayer fill:#ef4444,stroke:#dc2626,color:#fff

    class UI,Pages,State clientLayer
    class Router,Middleware,SSR appLayer
    class APIRoutes,JobsAPI,GeminiAPI,OllamaAPI apiLayer
    class Remotive,GoogleAI,LocalAI externalLayer
    class JobProcessor,TrendAnalyzer,AIResponseHandler dataLayer
```

## Component Architecture

```mermaid
graph TB
    subgraph "Page Components"
        HomePage[Home Page]
        DashboardPage[Dashboard Page]
        ChatPage[Chat Page]
        CareerPage[Career Page]
        LearningPathPage[Learning Path Page]
        ResumePage[Resume Page]
    end

    subgraph "Feature Components"
        PathGenerator[Path Generator Form]
        PathVisualizer[Path Visualizer]
        ResumePreview[Resume Preview]
        ChatInterface[Chat Interface]
        JobAnalyzer[Job Analyzer]
    end

    subgraph "UI Components"
        Navbar[Navigation Bar]
        Cards[Card Components]
        Buttons[Button Components]
        Forms[Form Components]
        Modals[Modal Components]
    end

    subgraph "Shared Libraries"
        Utils[Utility Functions]
        MockAI[Mock AI Service]
        Animations[Framer Motion]
        Styling[Tailwind CSS]
    end

    HomePage --> Navbar
    DashboardPage --> Navbar
    ChatPage --> ChatInterface
    CareerPage --> JobAnalyzer
    LearningPathPage --> PathGenerator
    LearningPathPage --> PathVisualizer
    ResumePage --> ResumePreview

    PathGenerator --> Forms
    PathVisualizer --> Cards
    ResumePreview --> Forms
    ChatInterface --> Forms
    JobAnalyzer --> Cards

    Navbar --> Buttons
    Cards --> Styling
    Buttons --> Styling
    Forms --> Styling
    Modals --> Styling

    PathGenerator --> Utils
    PathVisualizer --> Animations
    ChatInterface --> MockAI
    JobAnalyzer --> MockAI

    classDef pageLayer fill:#3b82f6,stroke:#1e40af,color:#fff
    classDef featureLayer fill:#8b5cf6,stroke:#7c3aed,color:#fff
    classDef uiLayer fill:#10b981,stroke:#059669,color:#fff
    classDef sharedLayer fill:#f59e0b,stroke:#d97706,color:#fff

    class HomePage,DashboardPage,ChatPage,CareerPage,LearningPathPage,ResumePage pageLayer
    class PathGenerator,PathVisualizer,ResumePreview,ChatInterface,JobAnalyzer featureLayer
    class Navbar,Cards,Buttons,Forms,Modals uiLayer
    class Utils,MockAI,Animations,Styling sharedLayer
```

## Data Flow Architecture

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant NextJS
    participant API
    participant External
    participant AI

    User->>UI: Interact with Interface
    UI->>NextJS: Route Request
    NextJS->>API: API Call
    
    alt Job Market Data
        API->>External: Fetch from Remotive
        External-->>API: Job Listings
        API->>API: Process & Analyze Trends
        API-->>UI: Processed Data
    end

    alt AI Interaction
        API->>AI: Send Prompt
        AI-->>API: AI Response
        API-->>UI: Formatted Response
    end

    alt Learning Path Generation
        UI->>API: Generate Path Request
        API->>AI: Create Learning Path
        AI-->>API: Structured Path Data
        API-->>UI: Path Visualization Data
    end

    UI-->>User: Updated Interface
```

## Technology Stack Architecture

```mermaid
graph LR
    subgraph "Frontend Stack"
        React[React 19.2.3]
        NextJS[Next.js 16.1.3]
        TypeScript[TypeScript 5.x]
        TailwindCSS[Tailwind CSS 4.x]
        FramerMotion[Framer Motion 12.x]
    end

    subgraph "Development Tools"
        ESLint[ESLint 9.x]
        PostCSS[PostCSS]
        NodeJS[Node.js 20+]
    end

    subgraph "External APIs"
        RemotiveAPI[Remotive Jobs API]
        GeminiAPI[Google Gemini API]
        OllamaLocal[Ollama Local AI]
    end

    subgraph "Deployment"
        Vercel[Vercel Platform]
        EdgeFunctions[Edge Functions]
        CDN[Global CDN]
    end

    React --> NextJS
    NextJS --> TypeScript
    TypeScript --> TailwindCSS
    TailwindCSS --> FramerMotion

    NextJS --> ESLint
    TailwindCSS --> PostCSS
    NextJS --> NodeJS

    NextJS --> RemotiveAPI
    NextJS --> GeminiAPI
    NextJS --> OllamaLocal

    NextJS --> Vercel
    Vercel --> EdgeFunctions
    Vercel --> CDN

    classDef frontend fill:#3b82f6,stroke:#1e40af,color:#fff
    classDef tools fill:#8b5cf6,stroke:#7c3aed,color:#fff
    classDef apis fill:#10b981,stroke:#059669,color:#fff
    classDef deploy fill:#f59e0b,stroke:#d97706,color:#fff

    class React,NextJS,TypeScript,TailwindCSS,FramerMotion frontend
    class ESLint,PostCSS,NodeJS tools
    class RemotiveAPI,GeminiAPI,OllamaLocal apis
    class Vercel,EdgeFunctions,CDN deploy
```

## File Structure Architecture

```
navixa/
├── 📁 src/
│   ├── 📁 app/                    # Next.js App Router
│   │   ├── 📁 api/               # API Routes
│   │   │   ├── 📁 gemini/        # Google AI Integration
│   │   │   ├── 📁 jobs/          # Job Market Data
│   │   │   └── 📁 ollama/        # Local AI Integration
│   │   ├── 📁 career/            # Career Intelligence Page
│   │   ├── 📁 chat/              # AI Mentor Chat
│   │   ├── 📁 dashboard/         # User Dashboard
│   │   ├── 📁 learning-path/     # Learning Path Generator
│   │   ├── 📁 resume/            # Resume Builder
│   │   ├── 📄 globals.css        # Global Styles
│   │   ├── 📄 layout.tsx         # Root Layout
│   │   └── 📄 page.tsx           # Home Page
│   ├── 📁 components/            # React Components
│   │   ├── 📁 features/          # Feature-specific Components
│   │   │   ├── 📄 PathGeneratorForm.tsx
│   │   │   ├── 📄 PathVisualizer.tsx
│   │   │   └── 📄 ResumePreview.tsx
│   │   └── 📁 ui/                # Reusable UI Components
│   │       └── 📄 navbar.tsx
│   └── 📁 lib/                   # Shared Libraries
│       ├── 📄 mock-ai.ts         # AI Service Mock
│       └── 📄 utils.ts           # Utility Functions
├── 📁 public/                    # Static Assets
├── 📄 package.json              # Dependencies
├── 📄 next.config.ts            # Next.js Configuration
├── 📄 tailwind.config.js        # Tailwind Configuration
├── 📄 tsconfig.json             # TypeScript Configuration
└── 📄 postcss.config.mjs        # PostCSS Configuration
```

## Security Architecture

```mermaid
graph TB
    subgraph "Client Security"
        CSP[Content Security Policy]
        XSS[XSS Protection]
        InputValidation[Input Validation]
    end

    subgraph "API Security"
        RateLimit[Rate Limiting]
        APIKeys[API Key Management]
        CORS[CORS Configuration]
    end

    subgraph "Data Security"
        Encryption[Data Encryption]
        Privacy[Privacy Compliance]
        SessionMgmt[Session Management]
    end

    subgraph "Infrastructure Security"
        HTTPS[HTTPS/TLS]
        EdgeSecurity[Edge Security]
        Monitoring[Security Monitoring]
    end

    CSP --> XSS
    XSS --> InputValidation
    InputValidation --> RateLimit
    
    RateLimit --> APIKeys
    APIKeys --> CORS
    CORS --> Encryption
    
    Encryption --> Privacy
    Privacy --> SessionMgmt
    SessionMgmt --> HTTPS
    
    HTTPS --> EdgeSecurity
    EdgeSecurity --> Monitoring

    classDef clientSec fill:#ef4444,stroke:#dc2626,color:#fff
    classDef apiSec fill:#f59e0b,stroke:#d97706,color:#fff
    classDef dataSec fill:#8b5cf6,stroke:#7c3aed,color:#fff
    classDef infraSec fill:#10b981,stroke:#059669,color:#fff

    class CSP,XSS,InputValidation clientSec
    class RateLimit,APIKeys,CORS apiSec
    class Encryption,Privacy,SessionMgmt dataSec
    class HTTPS,EdgeSecurity,Monitoring infraSec
```

## Performance Architecture

```mermaid
graph LR
    subgraph "Frontend Optimization"
        CodeSplit[Code Splitting]
        LazyLoad[Lazy Loading]
        ImageOpt[Image Optimization]
        FontOpt[Font Optimization]
    end

    subgraph "Caching Strategy"
        StaticGen[Static Generation]
        ISR[Incremental Static Regeneration]
        APICache[API Response Caching]
        CDNCache[CDN Caching]
    end

    subgraph "Runtime Performance"
        SSR[Server-Side Rendering]
        EdgeFunc[Edge Functions]
        Streaming[Response Streaming]
        Prefetch[Route Prefetching]
    end

    CodeSplit --> StaticGen
    LazyLoad --> ISR
    ImageOpt --> APICache
    FontOpt --> CDNCache

    StaticGen --> SSR
    ISR --> EdgeFunc
    APICache --> Streaming
    CDNCache --> Prefetch

    classDef frontend fill:#3b82f6,stroke:#1e40af,color:#fff
    classDef caching fill:#10b981,stroke:#059669,color:#fff
    classDef runtime fill:#8b5cf6,stroke:#7c3aed,color:#fff

    class CodeSplit,LazyLoad,ImageOpt,FontOpt frontend
    class StaticGen,ISR,APICache,CDNCache caching
    class SSR,EdgeFunc,Streaming,Prefetch runtime
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Development"
        LocalDev[Local Development]
        HotReload[Hot Reload]
        DevServer[Dev Server]
    end

    subgraph "Build Process"
        TypeCheck[Type Checking]
        Linting[ESLint]
        Building[Next.js Build]
        Optimization[Bundle Optimization]
    end

    subgraph "Deployment Pipeline"
        GitPush[Git Push]
        VercelDeploy[Vercel Deployment]
        EdgeDeploy[Edge Deployment]
        CDNUpdate[CDN Update]
    end

    subgraph "Production"
        GlobalCDN[Global CDN]
        EdgeNodes[Edge Nodes]
        Monitoring[Performance Monitoring]
        Analytics[Usage Analytics]
    end

    LocalDev --> TypeCheck
    HotReload --> Linting
    DevServer --> Building
    
    TypeCheck --> Building
    Linting --> Building
    Building --> Optimization
    
    Optimization --> GitPush
    GitPush --> VercelDeploy
    VercelDeploy --> EdgeDeploy
    EdgeDeploy --> CDNUpdate
    
    CDNUpdate --> GlobalCDN
    GlobalCDN --> EdgeNodes
    EdgeNodes --> Monitoring
    Monitoring --> Analytics

    classDef dev fill:#3b82f6,stroke:#1e40af,color:#fff
    classDef build fill:#8b5cf6,stroke:#7c3aed,color:#fff
    classDef deploy fill:#10b981,stroke:#059669,color:#fff
    classDef prod fill:#f59e0b,stroke:#d97706,color:#fff

    class LocalDev,HotReload,DevServer dev
    class TypeCheck,Linting,Building,Optimization build
    class GitPush,VercelDeploy,EdgeDeploy,CDNUpdate deploy
    class GlobalCDN,EdgeNodes,Monitoring,Analytics prod
```

## AI Integration Architecture

```mermaid
graph TB
    subgraph "AI Service Layer"
        AIRouter[AI Service Router]
        GeminiService[Gemini Service]
        OllamaService[Ollama Service]
        MockService[Mock AI Service]
    end

    subgraph "AI Use Cases"
        ChatBot[AI Mentor Chat]
        PathGen[Learning Path Generation]
        JobAnalysis[Job Analysis]
        ResumeEnhance[Resume Enhancement]
        TrendPrediction[Trend Prediction]
    end

    subgraph "Data Processing"
        PromptEngine[Prompt Engineering]
        ResponseParser[Response Parser]
        ContextManager[Context Manager]
        ErrorHandler[Error Handler]
    end

    AIRouter --> GeminiService
    AIRouter --> OllamaService
    AIRouter --> MockService

    ChatBot --> AIRouter
    PathGen --> AIRouter
    JobAnalysis --> AIRouter
    ResumeEnhance --> AIRouter
    TrendPrediction --> AIRouter

    GeminiService --> PromptEngine
    OllamaService --> PromptEngine
    MockService --> PromptEngine

    PromptEngine --> ResponseParser
    ResponseParser --> ContextManager
    ContextManager --> ErrorHandler

    classDef aiService fill:#8b5cf6,stroke:#7c3aed,color:#fff
    classDef useCases fill:#3b82f6,stroke:#1e40af,color:#fff
    classDef processing fill:#10b981,stroke:#059669,color:#fff

    class AIRouter,GeminiService,OllamaService,MockService aiService
    class ChatBot,PathGen,JobAnalysis,ResumeEnhance,TrendPrediction useCases
    class PromptEngine,ResponseParser,ContextManager,ErrorHandler processing
```

---

*This architecture diagram provides a comprehensive view of Navixa's system design, component relationships, and technical infrastructure. It serves as a reference for understanding the application's structure and can guide future development and scaling decisions.*