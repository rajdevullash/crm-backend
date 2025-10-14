# Revenue Overview API - Quick Reference

## 🚀 Quick Start

### **Endpoint:**
```
GET /api/v1/dashboard/revenue-overview
```

### **Auth Required:** ✅ (Admin, Super Admin only)

---

## 📋 Query Parameters

| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| `year` | number | `2025` | Filter by year (default: current year) |
| `month` | number | `10` | Filter by month 1-12 (optional) |

---

## 🎯 Usage Examples

### **1. Get Current Year (Default)**
```bash
GET /api/v1/dashboard/revenue-overview
```
Returns all months of current year

### **2. Get Specific Year**
```bash
GET /api/v1/dashboard/revenue-overview?year=2024
```
Returns all months of 2024

### **3. Get Specific Month**
```bash
GET /api/v1/dashboard/revenue-overview?year=2025&month=10
```
Returns only October 2025 data

---

## 📊 Response Format

```typescript
{
  statusCode: 200,
  success: true,
  message: "Revenue overview retrieved successfully",
  data: {
    summary: {
      totalRevenue: number,        // Sum of all budgets
      totalConvertedLeads: number, // Count of conversions
      averageDealValue: number     // Average per deal
    },
    monthlyData: [
      {
        year: number,               // e.g., 2025
        month: number,              // 1-12
        monthName: string,          // "October"
        totalRevenue: number,       // Month total
        convertedLeadsCount: number,// Month conversions
        averageDealValue: number,   // Month average
        leads: [                    // Array of converted leads
          {
            _id: string,
            title: string,
            name: string,
            email: string,
            phone: string,
            budget: number,
            convertedDate: Date,
            assignedTo: ObjectId,
            createdBy: ObjectId
          }
        ]
      }
    ],
    filter: {
      year: number,
      month: number | null,
      filterType: "yearly" | "monthly"
    }
  }
}
```

---

## 🎨 Frontend Example (React)

```typescript
// Fetch revenue data
const fetchRevenue = async (year?: number, month?: number) => {
  const params = new URLSearchParams();
  if (year) params.append('year', year.toString());
  if (month) params.append('month', month.toString());
  
  const response = await fetch(
    `http://localhost:5000/api/v1/dashboard/revenue-overview?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  return response.json();
};

// Usage
const data = await fetchRevenue(2025, 10); // October 2025
const yearData = await fetchRevenue(2025); // All of 2025
const currentYear = await fetchRevenue();  // Current year
```

---

## 🔔 Socket.IO Event

### **Event Name:** `revenue:updated`

**Emitted when:** Revenue overview endpoint is called

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

**Listen:**
```typescript
socket.on('revenue:updated', (data) => {
  console.log('Revenue updated:', data.summary);
});
```

---

## ⚡ Key Features

✅ **Default yearly view** - No params = current year  
✅ **Monthly filtering** - Filter by specific month  
✅ **Detailed lead info** - See all converted leads  
✅ **Summary statistics** - Total, count, average  
✅ **Real-time updates** - Socket.IO integration  
✅ **Month names** - Human-readable month names  

---

## 🔍 What Counts as "Converted"?

A lead is considered converted when:
- Lead has moved to the **last stage** (highest position)
- Conversion date = `updatedAt` timestamp

---

## 💰 Revenue Calculation

- **Total Revenue** = Sum of all converted leads' `budget` fields
- **Average Deal Value** = Total Revenue ÷ Number of Conversions
- Leads without budget count as `$0`

---

## ❌ Error Cases

### **Invalid Month**
```json
{
  "statusCode": 400,
  "message": "Month must be between 1 and 12"
}
```

### **Unauthorized**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### **Forbidden (Wrong Role)**
```json
{
  "statusCode": 403,
  "message": "Forbidden"
}
```

---

## 📈 Common Use Cases

### **Dashboard Summary**
```typescript
// Get current year overview
const overview = await fetchRevenue();
```

### **Monthly Reports**
```typescript
// Get specific month
const october = await fetchRevenue(2025, 10);
```

### **Year Comparison**
```typescript
// Compare years
const last = await fetchRevenue(2024);
const current = await fetchRevenue(2025);
```

### **Quarterly Analysis**
```typescript
// Get Q4 (Oct, Nov, Dec)
const q4 = await Promise.all([
  fetchRevenue(2025, 10),
  fetchRevenue(2025, 11),
  fetchRevenue(2025, 12)
]);
```

---

## 🔧 Database Requirements

### **Indexes (Recommended):**
```javascript
db.leads.createIndex({ stage: 1, updatedAt: -1 });
db.stages.createIndex({ position: -1 });
```

### **Required Fields:**
- `leads.stage` (ObjectId)
- `leads.budget` (Number)
- `leads.updatedAt` (Date)
- `stages.position` (Number)

---

## 📝 Testing Commands

```bash
# Test default
curl http://localhost:5000/api/v1/dashboard/revenue-overview \
  -H "Authorization: Bearer TOKEN"

# Test year filter
curl "http://localhost:5000/api/v1/dashboard/revenue-overview?year=2024" \
  -H "Authorization: Bearer TOKEN"

# Test month filter
curl "http://localhost:5000/api/v1/dashboard/revenue-overview?year=2025&month=10" \
  -H "Authorization: Bearer TOKEN"
```

---

## 🎯 Summary

**Endpoint:** `GET /api/v1/dashboard/revenue-overview`  
**Auth:** Admin, Super Admin  
**Default:** Returns current year data  
**Filters:** `?year=2025&month=10`  
**Returns:** Summary + monthly breakdown + lead details  
**Socket:** Emits `revenue:updated` event  

---

**Last Updated:** October 14, 2025  
**Status:** ✅ Ready to Use
