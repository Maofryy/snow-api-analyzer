# ServiceNow API Benchmark Tool

A comprehensive benchmarking tool to compare performance and data consistency between ServiceNow's REST Table API and GraphQL API (GlideRecord_Query). This tool helps developers and administrators understand which API performs better for specific use cases and validates data equivalence between the two approaches.

## 🎯 Purpose

This application was designed to:

- **Compare API Performance**: Benchmark REST vs GraphQL response times, payload sizes, and throughput
- **Validate Data Consistency**: Ensure both APIs return equivalent data for the same queries
- **Showcase GraphQL Advantages**: Demonstrate scenarios where GraphQL excels (dot-walking, multi-table queries, schema tailoring)
- **Support Decision Making**: Help teams choose the right API for their specific use cases
- **Customer Demonstrations**: Easily adapt to different ServiceNow instances for customer presentations

## 🚀 Features

### 🆕 Latest Updates
- **🔍 Live Console System**: Real-time test monitoring with advanced filtering and search
- **🎉 Test Completion Modal**: Celebratory experience with comprehensive results and export options
- **📊 Test Specs Explorer**: Interactive test scenario browsing with code preview
- **🛠️ Custom Request Manager**: Build and manage custom REST vs GraphQL tests
- **⌨️ Keyboard Shortcuts**: Enhanced productivity (Ctrl+F, Ctrl+E, Ctrl+K)
- **📱 Responsive Design**: Mobile-friendly interface with professional animations

### Test Categories

1. **🚀 Dot-Walking Performance Tests**
   - Basic relationship traversal (incident → caller)
   - Deep relationship traversal (incident → caller → department → manager)
   - Complex multi-path dot-walking stress tests

2. **📊 Multi-Table Query Tests**
   - Service desk dashboard scenarios (4 tables in 1 GraphQL vs 4 REST calls)
   - Cross-table analytics requiring data from multiple tables

3. **📱 Schema Tailoring Tests**
   - Mobile-optimized scenarios with minimal data fetching
   - Report-specific data extraction

4. **⚡ Performance at Scale Tests**
   - High-volume data retrieval (500-2500 records)
   - Bulk export scenarios with and without relationships

5. **🌟 Real-World Developer Scenarios**
   - Complete incident detail page loads
   - Push notification context data

### Key Capabilities

- **Dual-Mode Authentication**: Automatic environment detection (development/production)
- **Live Console System**: Real-time test monitoring with filtering, search, and export capabilities
- **Test Completion Modal**: Celebratory animations with comprehensive results and sharing options
- **Test Specs Explorer**: Interactive browsing of 50+ test scenarios with code preview
- **Custom Request Manager**: Build, save, and manage custom REST vs GraphQL comparisons
- **Data Comparison Scoring**: Visual indicators (✓/✗ with percentages) showing data consistency
- **Detailed API Call Analysis**: View exact requests/responses with copy functionality ("See Details" button)
- **Performance Metrics**: Response times, payload sizes, and winner determination
- **Keyboard Shortcuts**: Enhanced productivity with Ctrl+F (search), Ctrl+E (export), Ctrl+K (clear)
- **Responsive Design**: Mobile-friendly interface with professional animations and accessibility
- **Single-File Deployment**: Optimized build for easy ServiceNow instance deployment

## 🛠️ Installation & Setup

### Prerequisites

- Node.js 18+ and npm
- Access to a ServiceNow instance with:
  - REST API access (`/api/now/table/`)
  - GraphQL API access (`/api/now/graphql`)
  - Valid user credentials or ServiceNow session

### Deployment Options

#### Option 1: Development Mode (External Access)
```bash
# Clone the repository
git clone <repository-url>
cd snow-api-analyzer

# Install dependencies
npm install

# Configure environment variables
echo 'VITE_INSTANCE_URL="https://your-instance.service-now.com/"' > .env
echo 'VITE_APP_USER="your-username"' >> .env
echo 'VITE_APP_PASSWORD="your-password"' >> .env

# Start the development server
npm run dev
```

The application will be available at `http://localhost:5173`

#### Option 2: Production Mode (ServiceNow Hosted)
The application automatically detects when running inside ServiceNow and uses session authentication:

```bash
# Build for ServiceNow deployment
npm run build

# The dist/ folder contains a single-file build optimized for ServiceNow
# Deploy the generated index.html to your ServiceNow instance
```

**Live Demo**: https://elosarldemo1.service-now.com/api/elosa/api_benchmark/home

## 📋 How to Use

### 1. **Connect to ServiceNow Instance**

#### Development Mode
   - Configure environment variables in `.env` file
   - Application automatically connects using basic authentication
   - Connection status displayed in header

#### Production Mode (ServiceNow)
   - Application automatically detects ServiceNow environment
   - Uses session token authentication
   - No manual connection required

### 2. **Choose Your Mode**

#### **API Benchmark Mode** (Classic)
   - Configure test categories and parameters
   - Run comprehensive batch tests
   - Monitor via Live Console with real-time filtering
   - Celebrate completion with results modal

#### **Test Explorer Mode** (NEW!)
   - Browse 50+ test scenarios interactively
   - Understand each test with detailed descriptions
   - Preview generated REST/GraphQL code
   - Execute individual tests on demand

### 3. **Configure Tests**
   - Enable/disable test categories based on your interests
   - Select specific test variants (e.g., singleLevel, multiLevel, complexTraversal)
   - Choose record limits for different scenarios (25, 50, 100, etc.)
   - Create custom requests with the Custom Request Manager
   - Expand test panels to see detailed configurations

### 4. **Run Benchmarks**
   - Click "Run Tests" to execute all enabled test categories
   - Monitor live progress with real-time status indicators in the Live Console
   - Use keyboard shortcuts: Ctrl+F (search), Ctrl+E (export), Ctrl+K (clear)
   - Filter logs by test type, level, API, or data consistency
   - Watch for data comparison scores (✓ green = equivalent, ✗ red = issues)

### 5. **Analyze Results**
   - **Live Console**: Real-time test monitoring with advanced filtering and search
   - **Test Completion Modal**: Celebratory experience with comprehensive results and export options
   - **API Call Details**: Click "See Details" to view exact requests/responses with copy functionality
   - **Copy Functionality**: Use copy icons to extract request/response data for your own testing
   - **Custom Requests**: Create and test your own scenarios
   - **Scoreboard**: Review overall performance metrics and winner statistics

## 🔍 What to Look For

### Performance Indicators

- **Response Times**: Which API responds faster for specific scenarios
- **Payload Sizes**: Data transfer efficiency comparison
- **Winner Distribution**: Overall performance patterns across test types

### Data Consistency

- **Green ✓ Scores**: High percentage (95%+) indicates excellent data consistency
- **Red ✗ Scores**: Lower percentages indicate potential data mismatches
- **Field Mismatches**: Detailed comparison showing specific differences

### GraphQL Advantages

Look for scenarios where GraphQL significantly outperforms REST:
- **Multi-table queries**: Single GraphQL query vs multiple REST calls
- **Deep dot-walking**: Reduced payload sizes with precise field selection
- **Schema tailoring**: Mobile/performance optimized data fetching

### Potential Issues

- **Authentication Errors**: Verify instance credentials and permissions
- **Data Mismatches**: May indicate differences in API behavior or field availability
- **Performance Variations**: Network conditions and instance load can affect results

## ⚙️ Adapting for Different Instances

### Easy Configuration Steps

1. **Update Instance Connection**:
   ```
   - URL: https://your-customer-instance.service-now.com
   - Username: valid_user
   - Password: user_password
   ```

2. **Verify Table Access**:
   - Ensure the instance has `incident`, `problem`, `change_request`, `sys_user` tables
   - Confirm GraphQL API is enabled (`/api/now/graphql`)
   - Test with a simple query first

3. **Customize Test Specifications** (Optional):
   ```typescript
   // In src/specs/testSpecs.ts
   // Modify tables, fields, or record limits based on instance schema
   table: 'incident',  // Change to available tables
   restFields: ['number', 'short_description'],  // Adjust field names
   recordLimits: [10, 25, 50]  // Adapt to instance size
   ```

4. **Instance-Specific Considerations**:
   - **Field Availability**: Some custom fields may not exist across instances
   - **Data Volume**: Adjust record limits based on instance size
   - **Performance Baseline**: Instance hardware affects absolute response times
   - **Schema Differences**: Custom tables/fields may require test modifications

### Customer Demo Tips

- **Start Small**: Begin with basic dot-walking tests to establish baseline
- **Highlight GraphQL Benefits**: Focus on multi-table and schema tailoring scenarios
- **Explain Data Consistency**: Show how both APIs return equivalent data
- **Discuss Use Cases**: Match test scenarios to customer's actual needs
- **Performance Context**: Explain that relative performance matters more than absolute times

## 📊 Understanding Results

### Data Comparison Scores

- **100%**: Perfect data consistency
- **95-99%**: Excellent consistency (minor formatting differences)
- **80-94%**: Good consistency (some field variations)
- **<80%**: Investigate potential issues

### Performance Metrics

- **Response Time**: Milliseconds for API calls to complete
- **Payload Size**: Bytes transferred (smaller is generally better)
- **Request Count**: Number of API calls needed (fewer is better for GraphQL multi-table scenarios)

### Winner Determination

- Based on response time comparison
- Considers successful requests only
- Factors in both performance and data consistency

## 🔧 Development

### Project Structure

```
src/
├── components/           # React components
│   ├── ExecutionArea/   # Test execution and progress
│   │   ├── LiveConsole/ # Real-time monitoring system
│   │   └── TestCompletionModal.tsx # Celebration modal
│   ├── Header/          # Instance connection and status
│   ├── Scoreboard/      # Results display
│   ├── TestConfiguration/ # Test setup and custom requests
│   ├── TestSpecs/       # Test explorer components
│   └── ui/              # shadcn/ui components
├── contexts/            # React context for state management
├── services/            # Authentication and API services
├── specs/               # Test specifications and scenarios
├── types/               # TypeScript definitions
└── utils/               # API builders, environment detection, utilities
docs/                    # Comprehensive documentation
├── README.md           # Documentation overview
├── CLAUDE.md           # Developer guide
├── GUIDE_UTILISATION_DETAILLE.md # User manual (French)
├── IMPROVEMENTS.md     # Security & performance improvements
├── PRESENTATION_COLLEGUES.md # Team presentation (French)
└── customRequest.md    # Custom request feature documentation
```

### Key Architecture Files

- `src/services/authService.ts`: Dual-mode authentication (development/production)
- `src/utils/environment.ts`: Environment detection and configuration
- `src/utils/tokenManager.ts`: ServiceNow session token management
- `src/specs/testSpecs.ts`: Comprehensive test configurations
- `src/utils/apiBuilders.ts`: REST/GraphQL query builders
- `src/utils/dataComparison.ts`: Data consistency validation
- `src/contexts/BenchmarkContext.tsx`: Global state management

### Building

```bash
# Development build (with source maps)
npm run build:dev

# Production build (single-file for ServiceNow)
npm run build

# Lint code
npm run lint

# Preview build
npm run preview
```

### Environment Configuration

The application uses dual-mode authentication:

#### Development (.env file required)
```bash
VITE_INSTANCE_URL="https://your-instance.service-now.com/"
VITE_APP_USER="your-username"
VITE_APP_PASSWORD="your-password"
```

#### Production (ServiceNow-hosted)
- Automatic session token detection
- No environment variables needed
- Uses ServiceNow's built-in authentication

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🐛 Troubleshooting

### Common Issues

#### Development Mode
1. **Connection Failed**: 
   - Verify `.env` file exists with correct credentials
   - Check instance URL format (include https://)
   - Ensure ServiceNow instance is accessible externally
   - Verify username/password are correct

2. **Environment Variables Not Loading**:
   - Restart development server after creating/modifying `.env`
   - Ensure variables start with `VITE_` prefix
   - Check file is in project root directory

#### Production Mode (ServiceNow)
1. **Token Fetch Failed**:
   - Verify user is logged into ServiceNow
   - Check if GraphQL API is enabled on instance
   - Ensure proper ServiceNow session exists

2. **Authentication Errors**:
   - Clear browser cache and cookies
   - Re-login to ServiceNow
   - Check browser console for detailed error messages

#### General Issues
3. **GraphQL Errors**: Ensure GraphQL API is enabled on the instance
4. **Data Mismatches**: Check field availability and naming conventions
5. **Performance Variations**: Consider network conditions and instance load

### Debug Information

The application includes extensive logging. Check browser console for:
- Environment detection results
- Authentication flow details
- API call requests/responses
- Token management status

### Support

For issues or questions:
1. Check the browser console for error messages
2. Verify ServiceNow instance connectivity and API access
3. Review test configurations for field availability
4. Test with the live demo: https://elosarldemo1.service-now.com/api/elosa/api_benchmark/home
5. Open an issue with detailed error information and console logs

## 📚 Documentation

For comprehensive documentation, visit the [docs folder](./docs/):

- **[Technical Guide](./docs/CLAUDE.md)**: Complete developer documentation and architecture
- **[User Manual](./docs/GUIDE_UTILISATION_DETAILLE.md)**: Detailed usage guide (French)
- **[Improvements](./docs/IMPROVEMENTS.md)**: Security and performance enhancements
- **[Team Presentation](./docs/PRESENTATION_COLLEGUES.md)**: Quick overview for team members (French)
- **[Custom Requests](./docs/customRequest.md)**: Custom request feature documentation

---

**Built with React, TypeScript, and Vite. Designed for ServiceNow API analysis and benchmarking.**