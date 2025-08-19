# QA Panel API Documentation

## Services

### ModelHealthService
Service for monitoring model health and performance.

#### Methods
- `checkModelHealth(modelName: string): Promise<HealthStatus>`
  - Performs a comprehensive health check on the specified model
  - Returns health status including performance metrics and issues

- `getPerformanceMetrics(modelName: string): Promise<PerformanceMetrics>`
  - Retrieves current performance metrics for the model
  - Includes load time, response time, throughput, and memory usage

- `saveSettings(): void`
  - Saves current health monitoring settings to persistence

### ModelUpdateService
Service for managing model updates and versions.

#### Methods
- `scheduleUpdate(modelName: string, options?: UpdateOptions): Promise<void>`
  - Schedules an update for the specified model
  - Options include dependencies and force update flags

- `getUpdateHistory(modelName: string): UpdateRecord[]`
  - Retrieves update history for the specified model
  - Returns array of update records with timestamps and status

- `saveToPersistence(): void`
  - Saves current update queue and settings to persistence

### ModelCompatibilityService
Service for checking model compatibility.

#### Methods
- `checkCompatibility(modelName: string, options?: CompatibilityOptions): Promise<CompatibilityStatus>`
  - Checks compatibility of the specified model
  - Options include detailed check and force check flags

- `saveToPersistence(): void`
  - Saves compatibility settings to persistence

### ModelPredictiveService
Service for predictive analysis and forecasting.

#### Methods
- `getPredictions(modelName: string): PredictionResults`
  - Gets predictions for the specified model
  - Returns predicted issues and confidence scores

- `saveToPersistence(): void`
  - Saves prediction settings to persistence

### ModelManagementService
Service for unified model management.

#### Methods
- `getModelSummary(modelName: string): Promise<ModelSummary>`
  - Gets comprehensive summary of model status
  - Includes health, compatibility, updates, and predictions

- `getModelComparison(models: string[]): Promise<ComparisonResults>`
  - Compares multiple models across various metrics
  - Returns detailed comparison data

- `startBatchOperation(operation: BatchOperation): Promise<OperationResults>`
  - Starts a batch operation on multiple models
  - Returns operation results and status

- `setResourceAllocation(modelName: string, allocation: ResourceAllocation): void`
  - Sets resource allocation for the specified model

- `setLifecycleState(modelName: string, state: LifecycleState): void`
  - Sets lifecycle state for the specified model

### GlobalStateService
Service for managing global application state.

#### Methods
- `setState(newState: Partial<GlobalState>): void`
  - Updates global state with new values

- `getState(): GlobalState`
  - Returns current global state

- `setLoadingState(key: string, isLoading: boolean): void`
  - Sets loading state for specified key

- `setError(key: string, error?: Error): void`
  - Sets error state for specified key

- `addNotification(notification: Notification): string`
  - Adds a new notification
  - Returns notification ID

- `removeNotification(id: string): void`
  - Removes notification by ID

- `addListener(callback: StateListener): () => void`
  - Adds state change listener
  - Returns cleanup function

## Types

### HealthStatus
```typescript
interface HealthStatus {
    status: 'healthy' | 'warning' | 'error';
    score: number;
    errors: HealthError[];
    performance: PerformanceMetrics;
}
```

### PerformanceMetrics
```typescript
interface PerformanceMetrics {
    loadTime: number;
    responseTime: number;
    throughput: number;
    memoryUsage: number;
    cpuUsage: number;
    uptime: number;
}
```

### UpdateOptions
```typescript
interface UpdateOptions {
    dependencies?: boolean;
    force?: boolean;
}
```

### UpdateRecord
```typescript
interface UpdateRecord {
    timestamp: number;
    fromVersion: string;
    toVersion: string;
    status: 'completed' | 'failed';
    error?: string;
}
```

### CompatibilityOptions
```typescript
interface CompatibilityOptions {
    detailed?: boolean;
    force?: boolean;
}
```

### CompatibilityStatus
```typescript
interface CompatibilityStatus {
    compatible: boolean;
    issues: CompatibilityIssue[];
}
```

### PredictionResults
```typescript
interface PredictionResults {
    issues: PredictedIssue[];
    confidence: number;
}
```

### ModelSummary
```typescript
interface ModelSummary {
    info: ModelInfo;
    health: HealthStatus;
    compatibility: CompatibilityStatus;
    updates: UpdateStatus;
    predictions: PredictionResults;
    resources: ResourceAllocation;
    lifecycle: LifecycleState;
}
```

### BatchOperation
```typescript
interface BatchOperation {
    models: string[];
    type: 'update' | 'health_check' | 'compatibility_check';
    options?: Record<string, any>;
}
```

### ResourceAllocation
```typescript
interface ResourceAllocation {
    maxMemory: number;
    maxThreads: number;
    priority: 'high' | 'normal' | 'low';
    gpuEnabled: boolean;
}
```

### LifecycleState
```typescript
interface LifecycleState {
    stage: 'development' | 'testing' | 'staging' | 'production' | 'deprecated' | 'archived';
    status: 'active' | 'maintenance' | 'degraded' | 'disabled' | 'retired';
    notes?: string;
}
```

### GlobalState
```typescript
interface GlobalState {
    activePanel: string | null;
    selectedModels: Set<string>;
    loadingStates: Map<string, boolean>;
    errors: Map<string, Error>;
    shortcuts: Map<string, () => void>;
    notifications: Notification[];
}
```

### Notification
```typescript
interface Notification {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
    duration?: number;
    timestamp: number;
}
```

## Events

### ModelManagementService Events
- `batch_operation_started`: Emitted when batch operation starts
- `batch_operation_progress`: Emitted during batch operation progress
- `batch_operation_completed`: Emitted when batch operation completes
- `batch_operation_failed`: Emitted when batch operation fails
- `resource_allocation_updated`: Emitted when resource allocation changes
- `lifecycle_state_updated`: Emitted when lifecycle state changes

### GlobalStateService Events
- State changes trigger registered listeners with new state
- Loading state changes trigger UI updates
- Error state changes trigger notifications
- Notifications trigger UI updates

## Usage Examples

### Health Check
```javascript
const health = await window.modelHealthService.checkModelHealth('gpt-4');
if (health.status === 'error') {
    console.error('Health check failed:', health.errors);
}
```

### Schedule Update
```javascript
await window.modelUpdateService.scheduleUpdate('gpt-4', {
    dependencies: true,
    force: false
});
```

### Check Compatibility
```javascript
const compatibility = await window.modelCompatibilityService.checkCompatibility('gpt-4', {
    detailed: true
});
if (!compatibility.compatible) {
    console.warn('Compatibility issues:', compatibility.issues);
}
```

### Get Predictions
```javascript
const predictions = window.modelPredictiveService.getPredictions('gpt-4');
if (predictions.issues.length > 0) {
    console.warn('Predicted issues:', predictions.issues);
}
```

### Batch Operation
```javascript
const result = await window.modelManagementService.startBatchOperation({
    models: ['gpt-4', 'gpt-3.5'],
    type: 'health_check'
});
```

### Global State
```javascript
// Add state listener
const cleanup = window.globalStateService.addListener(state => {
    console.log('State updated:', state);
});

// Set loading state
window.globalStateService.setLoadingState('health-check', true);

// Add notification
window.globalStateService.addNotification({
    type: 'success',
    message: 'Health check completed',
    duration: 3000
});

// Cleanup listener
cleanup();
