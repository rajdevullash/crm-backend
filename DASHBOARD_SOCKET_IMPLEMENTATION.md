# Dashboard Socket.IO Implementation Guide

## Overview

Socket.IO has been successfully implemented in the Dashboard module to provide **real-time leaderboard updates** to all connected clients. This allows users to see leaderboard changes instantly without refreshing the page.

---

## Architecture

### **Files Modified/Created:**

1. ✅ **dashboard.controller.ts** - Controller with Socket.IO emission
2. ✅ **dashboard.service.ts** - Exported as DashboardService
3. ✅ **dashboard.route.ts** - Route definitions with auth
4. ✅ **socketService.ts** - Added emitDashboardEvent function
5. ✅ **routes/index.ts** - Registered dashboard routes

---

## Socket Events

### **Event: `leaderboard:updated`**

**Triggered:** Every time the leaderboard endpoint is called

**Payload Structure:**
```typescript
{
  message: "Leaderboard data updated",
  leaderboard: [
    {
      _id: "userId",
      name: "Sarah",
      email: "sarah@company.com",
      role: "representative",
      profileImage: "url",
      totalLeads: 15,
      convertedLeadsCount: 5,
      completedTasksCount: 60,
      completedTaskPoints: 48,        // 60 × 0.8
      nonConvertedTasksCount: 35,
      nonConvertedTaskPoints: 28,
      performancePoint: 50,
      convertedLeadPoints: 100,        // 5 × 20
      totalPoints: 198                 // 50 + 48 + 100
    },
    // ... more users sorted by totalPoints
  ],
  timestamp: "2025-10-14T10:30:00.000Z"
}
```

**Target Rooms:**
- `role_admin` - All admin users
- `role_super_admin` - All super admin users
- `role_representative` - All representative users

---

## API Endpoint

### **GET /api/v1/dashboard/leaderboard**

**Authentication:** Required (JWT)

**Authorized Roles:**
- Admin
- Super Admin
- Representative

**Request:**
```bash
GET /api/v1/dashboard/leaderboard
Authorization: Bearer <your-jwt-token>
```

**Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Leaderboard retrieved successfully",
  "data": [
    {
      "_id": "userId",
      "name": "Sarah",
      "email": "sarah@company.com",
      "role": "representative",
      "profileImage": "url",
      "totalLeads": 15,
      "convertedLeadsCount": 5,
      "completedTasksCount": 60,
      "completedTaskPoints": 48,
      "nonConvertedTasksCount": 35,
      "nonConvertedTaskPoints": 28,
      "performancePoint": 50,
      "convertedLeadPoints": 100,
      "totalPoints": 198
    }
  ]
}
```

---

## Frontend Implementation

### **1. Connect to Socket.IO Server**

```typescript
import { io, Socket } from 'socket.io-client';

// Initialize socket connection
const socket: Socket = io('http://localhost:5000', {
  auth: {
    token: localStorage.getItem('accessToken') // Your JWT token
  },
  transports: ['websocket', 'polling']
});

// Connection event listeners
socket.on('connect', () => {
  console.log('✅ Socket connected:', socket.id);
});

socket.on('disconnect', () => {
  console.log('🔌 Socket disconnected');
});

socket.on('connect_error', (error) => {
  console.error('❌ Socket connection error:', error);
});
```

---

### **2. Listen for Leaderboard Updates**

#### **React Hook Example:**

```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface LeaderboardUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  profileImage?: string;
  totalLeads: number;
  convertedLeadsCount: number;
  completedTasksCount: number;
  completedTaskPoints: number;
  nonConvertedTasksCount: number;
  nonConvertedTaskPoints: number;
  performancePoint: number;
  convertedLeadPoints: number;
  totalPoints: number;
}

interface LeaderboardUpdate {
  message: string;
  leaderboard: LeaderboardUser[];
  timestamp: string;
}

export const useLeaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize socket
    const socketInstance = io('http://localhost:5000', {
      auth: {
        token: localStorage.getItem('accessToken')
      }
    });

    // Connection handlers
    socketInstance.on('connect', () => {
      console.log('✅ Socket connected');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setIsConnected(false);
    });

    // Listen for leaderboard updates
    socketInstance.on('leaderboard:updated', (data: LeaderboardUpdate) => {
      console.log('📊 Leaderboard updated:', data.message);
      setLeaderboard(data.leaderboard);
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Function to manually fetch leaderboard (also triggers socket event)
  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/v1/dashboard/leaderboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      const result = await response.json();
      if (result.success) {
        setLeaderboard(result.data);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  return {
    leaderboard,
    socket,
    isConnected,
    fetchLeaderboard
  };
};
```

---

### **3. Leaderboard Component Example**

```typescript
import React, { useEffect } from 'react';
import { useLeaderboard } from './hooks/useLeaderboard';

export const LeaderboardPage: React.FC = () => {
  const { leaderboard, isConnected, fetchLeaderboard } = useLeaderboard();

  // Fetch initial data
  useEffect(() => {
    fetchLeaderboard();
  }, []);

  return (
    <div className="leaderboard-container">
      <div className="header">
        <h1>🏆 Leaderboard</h1>
        <div className="connection-status">
          {isConnected ? (
            <span className="connected">🟢 Live</span>
          ) : (
            <span className="disconnected">🔴 Offline</span>
          )}
        </div>
      </div>

      <div className="leaderboard-list">
        {leaderboard.map((user, index) => (
          <div key={user._id} className="leaderboard-item">
            <div className="rank">
              {index === 0 && '🥇'}
              {index === 1 && '🥈'}
              {index === 2 && '🥉'}
              {index > 2 && `#${index + 1}`}
            </div>

            <div className="user-info">
              <img 
                src={user.profileImage || '/default-avatar.png'} 
                alt={user.name}
                className="avatar"
              />
              <div>
                <h3>{user.name}</h3>
                <span className="role">{user.role}</span>
              </div>
            </div>

            <div className="stats">
              <div className="stat">
                <span className="label">Leads</span>
                <span className="value">{user.totalLeads}</span>
              </div>
              <div className="stat">
                <span className="label">Conversions</span>
                <span className="value">{user.convertedLeadsCount}</span>
              </div>
              <div className="stat">
                <span className="label">Tasks</span>
                <span className="value">{user.completedTasksCount}</span>
              </div>
            </div>

            <div className="points-breakdown">
              <div className="points-detail">
                <span>Base:</span>
                <span>{user.performancePoint} pts</span>
              </div>
              <div className="points-detail">
                <span>Tasks:</span>
                <span>{user.completedTaskPoints} pts</span>
              </div>
              <div className="points-detail">
                <span>Conversions:</span>
                <span>{user.convertedLeadPoints} pts</span>
              </div>
            </div>

            <div className="total-score">
              <span className="label">Total</span>
              <span className="score">{user.totalPoints}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

### **4. Real-time Update Toast Notification**

```typescript
import { useEffect } from 'react';
import { toast } from 'react-toastify'; // or your preferred toast library
import { useLeaderboard } from './hooks/useLeaderboard';

export const LeaderboardWithNotifications: React.FC = () => {
  const { leaderboard, socket } = useLeaderboard();

  useEffect(() => {
    if (!socket) return;

    // Show toast when leaderboard updates
    socket.on('leaderboard:updated', (data) => {
      toast.info('📊 Leaderboard updated!', {
        position: 'top-right',
        autoClose: 3000,
      });
    });

    return () => {
      socket.off('leaderboard:updated');
    };
  }, [socket]);

  return (
    <div>
      {/* Your leaderboard UI */}
    </div>
  );
};
```

---

## How It Works

### **Flow Diagram:**

```
1. User makes request to GET /api/v1/dashboard/leaderboard
           ↓
2. Auth middleware validates JWT token
           ↓
3. Dashboard controller calls DashboardService.getLeaderboard()
           ↓
4. Service performs MongoDB aggregation with weighted scoring
           ↓
5. Controller receives leaderboard data
           ↓
6. Controller emits socket event 'leaderboard:updated' to target rooms
           ↓
7. All connected clients in target rooms receive update
           ↓
8. Frontend updates UI in real-time
           ↓
9. HTTP response sent back to original requester
```

---

## Socket Rooms

### **User-Specific Rooms:**
- `user_{userId}` - Individual user room (joined on connection)

### **Role-Based Rooms:**
- `role_admin` - All admin users
- `role_super_admin` - All super admin users
- `role_representative` - All representative users

**Benefit:** Allows targeted broadcasting to specific user groups

---

## When Are Socket Events Emitted?

### **Leaderboard Updates:**

Socket events are emitted in these scenarios:

1. **Direct API Call:**
   - Any user fetches `/api/v1/dashboard/leaderboard`
   - All users in target rooms get real-time update

2. **Triggered by Other Events:**
   Currently only on direct fetch, but you can enhance by triggering on:
   - Task completion
   - Lead conversion
   - Lead creation/deletion
   - Performance point changes

---

## Enhancement Opportunities

### **1. Automatic Leaderboard Refresh on Task/Lead Changes**

You can emit leaderboard updates from other services:

```typescript
// In lead.service.ts (when lead is converted)
import { emitDashboardEvent } from '../socket/socketService';
import { DashboardService } from '../dashboard/dashboard.service';

// After lead conversion
const updatedLeaderboard = await DashboardService.getLeaderboard();
emitDashboardEvent('leaderboard:updated', {
  message: 'Lead converted - leaderboard updated',
  leaderboard: updatedLeaderboard,
  trigger: 'lead:converted',
  timestamp: new Date().toISOString(),
}, ['role_admin', 'role_super_admin', 'role_representative']);
```

### **2. Individual Rank Change Notifications**

```typescript
// Detect rank changes and notify individual users
socket.emit(`user_${userId}`, {
  type: 'rank:changed',
  message: 'Your rank has changed!',
  oldRank: 5,
  newRank: 3,
  pointsGained: 25
});
```

### **3. Leaderboard Highlights**

```typescript
// Highlight top performers
emitDashboardEvent('leaderboard:topPerformer', {
  message: 'New top performer!',
  user: topUser,
  achievement: 'Reached #1 position'
}, ['role_admin', 'role_super_admin']);
```

---

## Testing

### **Test Socket Connection:**

```bash
# Install socket.io-client for testing
npm install -g wscat

# Connect to socket server
wscat -c ws://localhost:5000/socket.io/?EIO=4&transport=websocket
```

### **Test API Endpoint:**

```bash
# Get leaderboard (triggers socket event)
curl -X GET http://localhost:5000/api/v1/dashboard/leaderboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### **Monitor Socket Events:**

```typescript
// In your browser console
socket.onAny((event, ...args) => {
  console.log('Socket event:', event, args);
});
```

---

## Troubleshooting

### **Socket Not Connecting:**

1. Check if Socket.IO server is initialized in `server.ts`:
   ```typescript
   import { initializeSocket } from './app/modules/socket/socketService';
   initializeSocket(server);
   ```

2. Verify CORS settings in `socketService.ts`

3. Check JWT token is valid and included in auth

### **Not Receiving Updates:**

1. Check if user is authenticated (socket.data.user exists)
2. Verify user is in correct role-based room
3. Check browser console for socket connection status

### **Duplicate Events:**

1. Make sure socket listeners are cleaned up on component unmount
2. Use `socket.off(event)` in cleanup function

---

## Security Considerations

### ✅ **Authentication:**
- Socket connections require valid JWT token
- Token verified on connection

### ✅ **Authorization:**
- Users must have appropriate role to access leaderboard
- Room-based broadcasting ensures targeted delivery

### ✅ **Data Privacy:**
- Only authorized users receive leaderboard updates
- Personal data filtered based on role

---

## Performance Notes

### **Optimization Tips:**

1. **Debounce Frequent Updates:**
   ```typescript
   // Don't emit on every single task completion
   // Batch updates every 5 seconds
   let updateTimeout: NodeJS.Timeout;
   const emitLeaderboardUpdate = () => {
     clearTimeout(updateTimeout);
     updateTimeout = setTimeout(async () => {
       const leaderboard = await DashboardService.getLeaderboard();
       emitDashboardEvent('leaderboard:updated', { leaderboard });
     }, 5000);
   };
   ```

2. **Cache Leaderboard:**
   ```typescript
   // Cache for 30 seconds to reduce DB queries
   let cachedLeaderboard: any[] = [];
   let lastFetch = 0;
   const CACHE_TTL = 30000; // 30 seconds
   ```

3. **Pagination:**
   - For large teams, consider paginating leaderboard
   - Only send top 50 users in real-time updates

---

## Summary

✅ **What Was Implemented:**
- Socket.IO integration in dashboard module
- Real-time leaderboard updates
- Room-based broadcasting (role-based)
- Complete REST API endpoint
- Comprehensive documentation

✅ **Socket Events:**
- `leaderboard:updated` - Broadcasts updated leaderboard to all authorized users

✅ **API Endpoint:**
- `GET /api/v1/dashboard/leaderboard` - Returns leaderboard and emits socket event

✅ **Target Audience:**
- Admins
- Super Admins
- Representatives

✅ **Next Steps:**
1. Implement frontend Socket.IO client
2. Add real-time UI updates
3. Consider automatic triggers from task/lead changes
4. Add notifications for rank changes

---

**Last Updated:** October 14, 2025  
**Status:** ✅ Implemented and Ready for Frontend Integration
