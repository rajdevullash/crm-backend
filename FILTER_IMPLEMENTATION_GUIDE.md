# Lead Filtering Implementation Guide

## Backend Changes Completed ✅

### 1. Updated Filter Constants
**File:** `src/app/modules/lead/lead.constant.ts`

```typescript
export const leadFilterableFields = [
  'searchTerm',
  'source',
  'stage',
  'assignedTo',
  'createdBy',
  'minBudget',
  'maxBudget',
];

export const leadSearchableFields = ['title', 'name', 'email', 'phone'];
```

### 2. Updated Lead Filters Interface
**File:** `src/app/modules/lead/lead.interface.ts`

```typescript
export type ILeadFilters = {
  searchTerm?: string;
  source?: string;
  stage?: string;
  assignedTo?: string;
  createdBy?: string;
  minBudget?: string;
  maxBudget?: string;
};
```

### 3. Enhanced Service with Advanced Filtering
**File:** `src/app/modules/lead/lead.service.ts`

Features:
- ✅ Search across title, name, email, phone
- ✅ Filter by source (e.g., "Website", "Referral")
- ✅ Filter by stage (by stage ID)
- ✅ Filter by assignedTo (by user ID)
- ✅ Filter by createdBy (by user ID)
- ✅ Budget range filtering (minBudget - maxBudget)
- ✅ Role-based access control
- ✅ Default sorting by creation date

## Frontend Implementation Guide

### API Query Parameters

The backend now accepts these query parameters:

```typescript
// Example API calls:

// 1. Search only
GET /api/leads?searchTerm=john

// 2. Filter by source
GET /api/leads?source=Website

// 3. Filter by stage
GET /api/leads?stage=64f1a2b3c4d5e6f7g8h9i0j1

// 4. Filter by assigned user
GET /api/leads?assignedTo=64f1a2b3c4d5e6f7g8h9i0j1

// 5. Budget range
GET /api/leads?minBudget=1000&maxBudget=5000

// 6. Combined filters
GET /api/leads?searchTerm=john&source=Website&minBudget=1000&maxBudget=5000&stage=64f1a2b3c4d5e6f7g8h9i0j1

// 7. Pagination
GET /api/leads?page=1&limit=20&sortBy=createdAt&sortOrder=desc
```

### Frontend State Management

Add these state variables to your component:

```typescript
const [filters, setFilters] = useState({
  searchTerm: '',
  source: '',
  stage: '',
  assignedTo: '',
  createdBy: '',
  minBudget: '',
  maxBudget: '',
});

const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
```

### Filter Modal Component (Example)

```tsx
<Modal
  isOpen={isFilterModalOpen}
  onClose={() => setIsFilterModalOpen(false)}
  title="Filter Leads"
>
  <form onSubmit={handleFilterSubmit} className="space-y-4">
    {/* Source Filter */}
    <div>
      <label className="block text-sm font-medium mb-2">Source</label>
      <select
        value={filters.source}
        onChange={(e) => setFilters({ ...filters, source: e.target.value })}
        className="w-full px-4 py-2 rounded-lg border"
      >
        <option value="">All Sources</option>
        <option value="Website">Website</option>
        <option value="Referral">Referral</option>
        <option value="LinkedIn">LinkedIn</option>
        <option value="Cold Call">Cold Call</option>
      </select>
    </div>

    {/* Stage Filter */}
    <div>
      <label className="block text-sm font-medium mb-2">Stage</label>
      <select
        value={filters.stage}
        onChange={(e) => setFilters({ ...filters, stage: e.target.value })}
        className="w-full px-4 py-2 rounded-lg border"
      >
        <option value="">All Stages</option>
        {stages.map((stage) => (
          <option key={stage.id} value={stage.id}>
            {stage.title}
          </option>
        ))}
      </select>
    </div>

    {/* Assigned To Filter */}
    <div>
      <label className="block text-sm font-medium mb-2">Assigned To</label>
      <select
        value={filters.assignedTo}
        onChange={(e) => setFilters({ ...filters, assignedTo: e.target.value })}
        className="w-full px-4 py-2 rounded-lg border"
      >
        <option value="">All Users</option>
        {users?.data?.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </select>
    </div>

    {/* Budget Range */}
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium mb-2">Min Budget</label>
        <input
          type="number"
          value={filters.minBudget}
          onChange={(e) => setFilters({ ...filters, minBudget: e.target.value })}
          placeholder="$0"
          className="w-full px-4 py-2 rounded-lg border"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Max Budget</label>
        <input
          type="number"
          value={filters.maxBudget}
          onChange={(e) => setFilters({ ...filters, maxBudget: e.target.value })}
          placeholder="$10,000"
          className="w-full px-4 py-2 rounded-lg border"
        />
      </div>
    </div>

    {/* Action Buttons */}
    <div className="flex gap-3 pt-4">
      <button
        type="button"
        onClick={handleClearFilters}
        className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
      >
        Clear Filters
      </button>
      <button
        type="submit"
        className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
      >
        Apply Filters
      </button>
    </div>
  </form>
</Modal>
```

### Filter Logic Implementation

```typescript
// Update the useEffect for debounced search and filters
useEffect(() => {
  const delayDebounce = setTimeout(() => {
    const params: Record<string, string> = {};
    
    // Add all active filters to params
    if (filters.searchTerm) params.searchTerm = filters.searchTerm;
    if (filters.source) params.source = filters.source;
    if (filters.stage) params.stage = filters.stage;
    if (filters.assignedTo) params.assignedTo = filters.assignedTo;
    if (filters.minBudget) params.minBudget = filters.minBudget;
    if (filters.maxBudget) params.maxBudget = filters.maxBudget;
    
    const queryString = new URLSearchParams(params).toString();
    dispatch(fetchLeads({ query: queryString }));
  }, 500);

  return () => clearTimeout(delayDebounce);
}, [filters, dispatch]);

// Handle filter submit
const handleFilterSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  setIsFilterModalOpen(false);
  // Filters will be applied automatically by the useEffect above
};

// Handle clear filters
const handleClearFilters = () => {
  setFilters({
    searchTerm: '',
    source: '',
    stage: '',
    assignedTo: '',
    createdBy: '',
    minBudget: '',
    maxBudget: '',
  });
};

// Update the Filter button click handler
<button 
  onClick={() => setIsFilterModalOpen(true)}
  className="group px-5 py-3 border-2 border-border rounded-xl hover:border-primary/50 hover:bg-accent/50 transition-all duration-300 flex items-center gap-2 hover:scale-105 active:scale-95"
>
  <Filter className="h-4 w-4 group-hover:text-primary transition-colors" />
  <span className="font-medium">Filter</span>
  {/* Active filter count badge */}
  {Object.values(filters).filter(v => v !== '').length > 1 && (
    <span className="ml-1 px-2 py-0.5 text-xs font-bold bg-primary text-white rounded-full">
      {Object.values(filters).filter(v => v !== '').length - 1}
    </span>
  )}
</button>
```

### Active Filters Display (Optional Enhancement)

Show active filters as chips/badges:

```tsx
{/* Active Filters Display */}
{Object.entries(filters).some(([key, value]) => key !== 'searchTerm' && value) && (
  <div className="flex flex-wrap gap-2 items-center">
    <span className="text-sm font-medium text-muted-foreground">Active Filters:</span>
    
    {filters.source && (
      <div className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
        <span>Source: {filters.source}</span>
        <button
          onClick={() => setFilters({ ...filters, source: '' })}
          className="hover:text-primary/70"
        >
          ×
        </button>
      </div>
    )}
    
    {filters.stage && (
      <div className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
        <span>Stage: {stages.find(s => s.id === filters.stage)?.title}</span>
        <button
          onClick={() => setFilters({ ...filters, stage: '' })}
          className="hover:text-primary/70"
        >
          ×
        </button>
      </div>
    )}
    
    {(filters.minBudget || filters.maxBudget) && (
      <div className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
        <span>
          Budget: ${filters.minBudget || '0'} - ${filters.maxBudget || '∞'}
        </span>
        <button
          onClick={() => setFilters({ ...filters, minBudget: '', maxBudget: '' })}
          className="hover:text-primary/70"
        >
          ×
        </button>
      </div>
    )}
    
    <button
      onClick={handleClearFilters}
      className="text-sm text-muted-foreground hover:text-foreground underline"
    >
      Clear All
    </button>
  </div>
)}
```

## Testing the Filters

### Test Cases

1. **Search Test**
   ```
   GET /api/leads?searchTerm=john
   Should return leads with "john" in name, email, title, or phone
   ```

2. **Source Filter Test**
   ```
   GET /api/leads?source=Website
   Should return only leads from "Website" source
   ```

3. **Stage Filter Test**
   ```
   GET /api/leads?stage=STAGE_ID
   Should return leads in that specific stage
   ```

4. **Budget Range Test**
   ```
   GET /api/leads?minBudget=1000&maxBudget=5000
   Should return leads with budget between $1000 and $5000
   ```

5. **Combined Filters Test**
   ```
   GET /api/leads?source=Website&stage=STAGE_ID&minBudget=1000
   Should return leads matching ALL filter criteria
   ```

## Benefits of This Implementation

✅ **Advanced Filtering** - Multiple filter criteria support  
✅ **Budget Range** - Min/max budget filtering  
✅ **Search + Filter** - Can be used together  
✅ **Clean API** - RESTful query parameters  
✅ **Type Safe** - Full TypeScript support  
✅ **Role-Based** - Respects user permissions  
✅ **Performance** - Efficient MongoDB queries  
✅ **User-Friendly** - Clear filter UI with badges  
✅ **Scalable** - Easy to add more filters  

## Next Steps

1. Implement the filter modal in your frontend
2. Add filter state management
3. Update the Filter button to open the modal
4. Test each filter individually
5. Test combined filters
6. Add active filter badges display
7. Implement "Export with filters" functionality

Your backend is now fully ready to support advanced filtering! 🎉
