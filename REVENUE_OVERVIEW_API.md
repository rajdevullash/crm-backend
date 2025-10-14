# Revenue Overview API Documentation

## Overview

The Revenue Overview API provides insights into converted leads and their revenue over time. It shows monthly breakdown of conversions with budget information and supports filtering by year and month.

**Default Behavior:** Returns yearly data for the current year if no filters are provided.

---

## API Endpoint

### **GET /api/v1/dashboard/revenue-overview**

**Authentication:** Required (JWT)

**Authorized Roles:**
- Admin
- Super Admin

---

## Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `year` | number | No | Current year | Filter by specific year (e.g., 2025) |
| `month` | number | No | null | Filter by specific month (1-12) |

### **Parameter Rules:**

- **No parameters:** Returns all monthly data for the current year
- **Only `year`:** Returns all monthly data for that specific year
- **Both `year` and `month`:** Returns data for that specific month only
- **Month range:** Must be between 1-12, otherwise returns 400 error

---

## Request Examples

### **1. Get Current Year Data (Default)**
```bash
GET /api/v1/dashboard/revenue-overview
Authorization: Bearer <your-jwt-token>
```

### **2. Get Specific Year Data**
```bash
GET /api/v1/dashboard/revenue-overview?year=2024
Authorization: Bearer <your-jwt-token>
```

### **3. Get Specific Month Data**
```bash
GET /api/v1/dashboard/revenue-overview?year=2025&month=10
Authorization: Bearer <your-jwt-token>
```

### **4. Using cURL**
```bash
curl -X GET "http://localhost:5000/api/v1/dashboard/revenue-overview?year=2025" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Response Structure

### **Successful Response (200 OK)**

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Revenue overview retrieved successfully",
  "data": {
    "summary": {
      "totalRevenue": 150000,
      "totalConvertedLeads": 12,
      "averageDealValue": 12500
    },
    "monthlyData": [
      {
        "year": 2025,
        "month": 10,
        "monthName": "October",
        "totalRevenue": 45000,
        "convertedLeadsCount": 3,
        "averageDealValue": 15000,
        "leads": [
          {
            "_id": "671234567890abcdef123456",
            "title": "Enterprise Software Deal",
            "name": "John Smith",
            "email": "john@company.com",
            "phone": "+1234567890",
            "budget": 20000,
            "convertedDate": "2025-10-15T10:30:00.000Z",
            "assignedTo": "60d5f484f3b4b84f8c8e4a21",
            "createdBy": "60d5f484f3b4b84f8c8e4a22"
          },
          {
            "_id": "671234567890abcdef123457",
            "title": "Web Development Project",
            "name": "Sarah Johnson",
            "email": "sarah@business.com",
            "phone": "+1234567891",
            "budget": 15000,
            "convertedDate": "2025-10-20T14:15:00.000Z",
            "assignedTo": "60d5f484f3b4b84f8c8e4a21",
            "createdBy": "60d5f484f3b4b84f8c8e4a22"
          },
          {
            "_id": "671234567890abcdef123458",
            "title": "Mobile App Development",
            "name": "Mike Davis",
            "email": "mike@startup.com",
            "phone": "+1234567892",
            "budget": 10000,
            "convertedDate": "2025-10-25T09:45:00.000Z",
            "assignedTo": "60d5f484f3b4b84f8c8e4a23",
            "createdBy": "60d5f484f3b4b84f8c8e4a22"
          }
        ]
      },
      {
        "year": 2025,
        "month": 9,
        "monthName": "September",
        "totalRevenue": 35000,
        "convertedLeadsCount": 4,
        "averageDealValue": 8750,
        "leads": [...]
      },
      {
        "year": 2025,
        "month": 8,
        "monthName": "August",
        "totalRevenue": 50000,
        "convertedLeadsCount": 5,
        "averageDealValue": 10000,
        "leads": [...]
      }
    ],
    "filter": {
      "year": 2025,
      "month": null,
      "filterType": "yearly"
    }
  }
}
```

---

## Response Fields Explained

### **Summary Object:**

| Field | Type | Description |
|-------|------|-------------|
| `totalRevenue` | number | Sum of all converted leads' budgets in the filtered period |
| `totalConvertedLeads` | number | Total number of converted leads |
| `averageDealValue` | number | Average budget per converted lead (rounded to 2 decimals) |

### **Monthly Data Array:**

Each month object contains:

| Field | Type | Description |
|-------|------|-------------|
| `year` | number | Year of the data |
| `month` | number | Month number (1-12) |
| `monthName` | string | Month name (January, February, etc.) |
| `totalRevenue` | number | Sum of budgets for that month |
| `convertedLeadsCount` | number | Number of conversions in that month |
| `averageDealValue` | number | Average deal value for that month |
| `leads` | array | Array of converted lead details |

### **Lead Object (in leads array):**

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Lead ID |
| `title` | string | Lead title |
| `name` | string | Lead contact name |
| `email` | string | Lead email |
| `phone` | string | Lead phone |
| `budget` | number | Lead budget/deal value |
| `convertedDate` | Date | When the lead was converted (updatedAt) |
| `assignedTo` | ObjectId | User ID who was assigned the lead |
| `createdBy` | ObjectId | User ID who created the lead |

### **Filter Object:**

| Field | Type | Description |
|-------|------|-------------|
| `year` | number | The year used for filtering |
| `month` | number \| null | The month used (null if yearly view) |
| `filterType` | string | Either "yearly" or "monthly" |

---

## Error Responses

### **Invalid Month (400 Bad Request)**
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Month must be between 1 and 12",
  "data": null
}
```

### **Unauthorized (401 Unauthorized)**
```json
{
  "statusCode": 401,
  "success": false,
  "message": "Unauthorized",
  "data": null
}
```

### **Forbidden (403 Forbidden)**
```json
{
  "statusCode": 403,
  "success": false,
  "message": "Forbidden",
  "data": null
}
```

---

## How It Works

### **Conversion Detection:**

The API identifies converted leads by:
1. Finding the **last stage** (highest position in stages collection)
2. Matching leads that have moved to this final stage
3. Using the `updatedAt` timestamp as the conversion date

### **Date Filtering Logic:**

1. **No parameters:**
   - Uses current year
   - Returns all months with conversions

2. **Year only:**
   - Filters: Jan 1, YEAR 00:00:00 to Dec 31, YEAR 23:59:59
   - Returns all months in that year

3. **Year + Month:**
   - Filters: First day of month to last day of month
   - Returns only that specific month's data

### **Revenue Calculation:**

- **Total Revenue:** Sum of all `budget` fields from converted leads
- **Average Deal Value:** Total Revenue ÷ Number of Converted Leads
- Leads without budget are counted as `0` in calculations

---

## Socket.IO Integration

### **Event Emitted:** `revenue:updated`

When the revenue overview endpoint is called, a Socket.IO event is broadcast to connected admins and super admins.

**Payload:**
```typescript
{
  message: "Revenue overview data updated",
  summary: {
    totalRevenue: 150000,
    totalConvertedLeads: 12,
    averageDealValue: 12500
  },
  filter: {
    year: 2025,
    month: null,
    filterType: "yearly"
  },
  timestamp: "2025-10-14T10:30:00.000Z"
}
```

**Target Rooms:**
- `role_admin`
- `role_super_admin`

---

## Frontend Implementation

### **1. React Hook for Revenue Overview**

```typescript
import { useEffect, useState } from 'react';
import axios from 'axios';

interface RevenueOverviewData {
  summary: {
    totalRevenue: number;
    totalConvertedLeads: number;
    averageDealValue: number;
  };
  monthlyData: Array<{
    year: number;
    month: number;
    monthName: string;
    totalRevenue: number;
    convertedLeadsCount: number;
    averageDealValue: number;
    leads: any[];
  }>;
  filter: {
    year: number;
    month: number | null;
    filterType: 'yearly' | 'monthly';
  };
}

export const useRevenueOverview = () => {
  const [data, setData] = useState<RevenueOverviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRevenueOverview = async (year?: number, month?: number) => {
    setLoading(true);
    setError(null);

    try {
      const params: any = {};
      if (year) params.year = year;
      if (month) params.month = month;

      const response = await axios.get(
        'http://localhost:5000/api/v1/dashboard/revenue-overview',
        {
          params,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }
      );

      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch revenue data');
    } finally {
      setLoading(false);
    }
  };

  return {
    data,
    loading,
    error,
    fetchRevenueOverview,
  };
};
```

---

### **2. Revenue Overview Component**

```typescript
import React, { useEffect, useState } from 'react';
import { useRevenueOverview } from './hooks/useRevenueOverview';

export const RevenueOverviewPage: React.FC = () => {
  const { data, loading, error, fetchRevenueOverview } = useRevenueOverview();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  // Fetch initial data (yearly view)
  useEffect(() => {
    fetchRevenueOverview(selectedYear);
  }, []);

  // Handle filter changes
  const handleFilterChange = () => {
    fetchRevenueOverview(selectedYear, selectedMonth || undefined);
  };

  const handleClearMonth = () => {
    setSelectedMonth(null);
    fetchRevenueOverview(selectedYear);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return null;

  return (
    <div className="revenue-overview">
      <h1>💰 Revenue Overview</h1>

      {/* Filters */}
      <div className="filters">
        <div className="filter-group">
          <label>Year:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {[2023, 2024, 2025, 2026].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Month (Optional):</label>
          <select
            value={selectedMonth || ''}
            onChange={(e) =>
              setSelectedMonth(e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="">All Months</option>
            {[
              'January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December'
            ].map((month, idx) => (
              <option key={idx} value={idx + 1}>
                {month}
              </option>
            ))}
          </select>
        </div>

        <button onClick={handleFilterChange}>Apply Filter</button>
        {selectedMonth && (
          <button onClick={handleClearMonth}>Clear Month</button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="card">
          <h3>Total Revenue</h3>
          <p className="amount">${data.summary.totalRevenue.toLocaleString()}</p>
        </div>

        <div className="card">
          <h3>Converted Leads</h3>
          <p className="count">{data.summary.totalConvertedLeads}</p>
        </div>

        <div className="card">
          <h3>Average Deal Value</h3>
          <p className="amount">${data.summary.averageDealValue.toLocaleString()}</p>
        </div>
      </div>

      {/* Monthly Breakdown */}
      <div className="monthly-breakdown">
        <h2>Monthly Breakdown</h2>
        {data.monthlyData.length === 0 ? (
          <p>No converted leads in this period</p>
        ) : (
          data.monthlyData.map((month) => (
            <div key={`${month.year}-${month.month}`} className="month-card">
              <div className="month-header">
                <h3>{month.monthName} {month.year}</h3>
                <div className="month-stats">
                  <span>{month.convertedLeadsCount} conversions</span>
                  <span className="revenue">${month.totalRevenue.toLocaleString()}</span>
                </div>
              </div>

              <div className="month-details">
                <p>Average: ${month.averageDealValue.toLocaleString()}</p>
              </div>

              {/* Lead List */}
              <div className="leads-list">
                <h4>Converted Leads:</h4>
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Budget</th>
                      <th>Converted Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {month.leads.map((lead) => (
                      <tr key={lead._id}>
                        <td>{lead.title}</td>
                        <td>{lead.name}</td>
                        <td>{lead.email}</td>
                        <td>${lead.budget.toLocaleString()}</td>
                        <td>{new Date(lead.convertedDate).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
```

---

### **3. Socket.IO Real-time Updates**

```typescript
import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';

export const RevenueOverviewWithRealtime: React.FC = () => {
  const { data, fetchRevenueOverview } = useRevenueOverview();

  useEffect(() => {
    const socket = io('http://localhost:5000', {
      auth: {
        token: localStorage.getItem('accessToken'),
      },
    });

    // Listen for revenue updates
    socket.on('revenue:updated', (data) => {
      console.log('💰 Revenue data updated:', data);
      
      toast.info(`Revenue updated: $${data.summary.totalRevenue.toLocaleString()}`, {
        position: 'top-right',
        autoClose: 3000,
      });

      // Refresh data
      fetchRevenueOverview();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div>
      {/* Your revenue overview UI */}
    </div>
  );
};
```

---

### **4. Chart Integration (with Recharts)**

```typescript
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export const RevenueChart: React.FC<{ data: any }> = ({ data }) => {
  const chartData = data.monthlyData.map((month: any) => ({
    name: month.monthName,
    revenue: month.totalRevenue,
    conversions: month.convertedLeadsCount,
    average: month.averageDealValue,
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="revenue" fill="#8884d8" name="Total Revenue" />
        <Bar dataKey="conversions" fill="#82ca9d" name="Conversions" />
      </BarChart>
    </ResponsiveContainer>
  );
};
```

---

## Use Cases

### **1. Monthly Performance Tracking**
```bash
# Get October 2025 data
GET /api/v1/dashboard/revenue-overview?year=2025&month=10
```

### **2. Year-over-Year Comparison**
```bash
# Get 2024 data
GET /api/v1/dashboard/revenue-overview?year=2024

# Get 2025 data
GET /api/v1/dashboard/revenue-overview?year=2025
```

### **3. Current Year Dashboard (Default)**
```bash
# No parameters - gets current year
GET /api/v1/dashboard/revenue-overview
```

### **4. Quarterly Reports**
```typescript
// Frontend: Fetch Q1, Q2, Q3, Q4 separately
const fetchQuarter = async (year: number, quarter: number) => {
  const months = {
    1: [1, 2, 3],
    2: [4, 5, 6],
    3: [7, 8, 9],
    4: [10, 11, 12],
  };

  const quarterData = await Promise.all(
    months[quarter].map(month =>
      fetchRevenueOverview(year, month)
    )
  );

  // Aggregate quarterly totals
  return quarterData;
};
```

---

## Database Schema Dependency

### **Required Collections:**

1. **Leads Collection:**
   - `stage` (ObjectId) - Reference to Stage
   - `budget` (Number) - Deal value
   - `updatedAt` (Date) - Conversion timestamp
   - Other fields: title, name, email, phone, assignedTo, createdBy

2. **Stages Collection:**
   - `position` (Number) - Stage order
   - Higher position = later stage
   - Last position = Converted stage

### **Conversion Logic:**

A lead is considered "converted" when:
- `lead.stage === lastStage._id`
- Where `lastStage` has the highest `position` value

---

## Performance Considerations

### **Optimization Tips:**

1. **Indexing:**
   ```javascript
   // Add compound index for better query performance
   db.leads.createIndex({ stage: 1, updatedAt: -1 })
   ```

2. **Caching:**
   - Cache yearly summaries (rarely change)
   - Invalidate cache on lead conversion
   - Use Redis for high-traffic applications

3. **Pagination (Future Enhancement):**
   - For teams with many leads, paginate the `leads` array
   - Add `limit` and `skip` parameters

---

## Testing

### **Test Cases:**

```bash
# 1. Test default (current year)
curl -X GET http://localhost:5000/api/v1/dashboard/revenue-overview \
  -H "Authorization: Bearer TOKEN"

# 2. Test specific year
curl -X GET "http://localhost:5000/api/v1/dashboard/revenue-overview?year=2024" \
  -H "Authorization: Bearer TOKEN"

# 3. Test specific month
curl -X GET "http://localhost:5000/api/v1/dashboard/revenue-overview?year=2025&month=10" \
  -H "Authorization: Bearer TOKEN"

# 4. Test invalid month (should return 400)
curl -X GET "http://localhost:5000/api/v1/dashboard/revenue-overview?month=13" \
  -H "Authorization: Bearer TOKEN"

# 5. Test unauthorized (should return 401)
curl -X GET http://localhost:5000/api/v1/dashboard/revenue-overview
```

---

## Troubleshooting

### **No Data Returned:**

1. Check if any leads have reached the final stage
2. Verify leads have `budget` values set
3. Check the date range (leads might be outside the filter period)
4. Ensure `updatedAt` is set when stage changes

### **Wrong Revenue Totals:**

1. Verify all converted leads have `budget` field
2. Check for leads with `budget: 0` or missing budget
3. Ensure stage detection is correct (last position)

### **Performance Issues:**

1. Add database indexes: `{ stage: 1, updatedAt: -1 }`
2. Limit date ranges for very large datasets
3. Consider caching summary data

---

## Summary

✅ **What Was Implemented:**
- Revenue overview API endpoint
- Monthly/Yearly filtering support
- Default yearly view
- Detailed lead information per month
- Summary statistics
- Socket.IO real-time updates

✅ **Features:**
- Total revenue calculation
- Conversion count tracking
- Average deal value
- Month-by-month breakdown
- Individual lead details
- Flexible filtering

✅ **Next Steps:**
1. Implement frontend with charts
2. Add export to CSV/Excel functionality
3. Create quarterly/yearly reports
4. Add revenue forecasting
5. Implement goal tracking

---

**Last Updated:** October 14, 2025  
**Status:** ✅ Implemented and Ready  
**Default Behavior:** Returns current year data when no filters provided
