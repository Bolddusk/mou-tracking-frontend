# Step 10 — Proposal Party Chat (Socket.io + Saved History)

**Backend:** `http://localhost:5000`  
**Socket path:** `/socket.io`  
**Auth:** JWT from login (`party_a` or `party_b` only)

After a proposal is **approved** and Party B is linked (`party_b_user_id`), Party A and Party B can chat in real time over **Socket.io**.

**Messages are saved in MySQL** — users can see old chat after refresh. Real-time delivery is still via Socket.io; history is loaded on join and via REST.

Use the **Activity Timeline** for formal milestones — chat is informal messaging between the two parties.

---

## When chat is available

| Condition | Required |
|-----------|----------|
| Proposal `status` | `approved` |
| `party_b_user_id` | Set (happens on sector-lead approve) |
| Logged-in user | `party_a` who owns the proposal **or** `party_b` linked to it |

Sector lead, super admin, and other roles **cannot** join proposal chat.

---

## Setup

```bash
cd investment-portal-backend
npm install
npm run db:migrate:proposal-chat
npm run dev
```

Creates table `proposal_chat_messages`.

**Frontend dependency:**

```bash
cd investment-portal-frontend
npm install socket.io-client
```

**`.env` (backend):**

```
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=your-secret
```

---

## REST — Load chat history

**`GET /api/proposals/:proposalId/messages`**

**Auth:** Party A or Party B (same access rules as socket)

**Query params (optional):**

| Param | Default | Max | Description |
|-------|---------|-----|-------------|
| `limit` | `100` | `200` | Number of messages (newest batch) |
| `before` | — | — | Message `id` — load older messages before this id (pagination) |

**Example:**

```
GET /api/proposals/25/messages?limit=50
Authorization: Bearer <token>
```

**Response:**

```json
{
  "proposalId": 25,
  "hasMore": false,
  "messages": [
    {
      "id": 1,
      "proposalId": 25,
      "senderId": 2,
      "senderName": "Ali Khan",
      "senderRole": "party_a",
      "text": "Hello — shall we schedule a call?",
      "sentAt": "2026-06-08T10:30:00.000Z"
    }
  ]
}
```

**Load older messages (scroll up):**

```
GET /api/proposals/25/messages?limit=50&before=1
```

Prepends older messages; `hasMore: true` when a full page was returned.

---

## Socket connection

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: { token: localStorage.getItem('token') },
  transports: ['websocket', 'polling'],
});
```

### Connection errors

| Event / case | Meaning |
|--------------|---------|
| `connect_error` with `Unauthorized` | Missing or invalid JWT |
| `connect_error` with `Only Party A and Party B can use chat` | Wrong role |

---

## Socket events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `chat:join` | `{ proposalId: number }` | Join room + receive saved history |
| `chat:leave` | `{ proposalId: number }` | Leave room |
| `chat:message` | `{ proposalId: number, text: string }` | Send message (saved to DB, max 2000 chars) |
| `chat:typing` | `{ proposalId: number, isTyping: boolean }` | Typing indicator (optional) |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `chat:joined` | See below | Join OK + history + online users |
| `chat:message` | See below | New message (live, already in DB) |
| `chat:presence` | `{ proposalId, online: [...] }` | Online users in room |
| `chat:typing` | `{ proposalId, userId, fullName, role, isTyping }` | Other user typing |
| `chat:error` | `{ code, message }` | Error |

---

## Payload shapes

### `chat:joined`

```json
{
  "proposalId": 25,
  "proposalTitle": "AVRIO Party B Email Test",
  "online": [
    { "userId": 2, "fullName": "Ali Khan", "role": "party_a" }
  ],
  "messages": [
    {
      "id": 1,
      "proposalId": 25,
      "senderId": 2,
      "senderName": "Ali Khan",
      "senderRole": "party_a",
      "text": "Hello — shall we schedule a call?",
      "sentAt": "2026-06-08T10:30:00.000Z"
    }
  ]
}
```

`messages` = last 100 saved messages (same as default REST limit).

### `chat:message`

```json
{
  "id": 2,
  "proposalId": 25,
  "senderId": 7,
  "senderName": "Li Wei",
  "senderRole": "party_b",
  "text": "Yes, Thursday works for us.",
  "sentAt": "2026-06-08T10:31:00.000Z"
}
```

`id` is the database integer (use for deduplication and pagination).

### `chat:error` codes

| Code | When |
|------|------|
| `INVALID_PROPOSAL` | Missing `proposalId` |
| `ACCESS_DENIED` | Not approved, not your proposal, or wrong role |
| `NOT_IN_ROOM` | Send before `chat:join` |
| `EMPTY_MESSAGE` | Blank text |
| `MESSAGE_TOO_LONG` | Over 2000 characters |
| `JOIN_FAILED` / `SEND_FAILED` | Server error |

---

## Recommended frontend flow

### 1. Show chat when approved

```javascript
const canChat =
  proposal.status === 'approved' &&
  proposal.party_b_user_id &&
  (user.role === 'party_a' || user.role === 'party_b');
```

### 2. Load history — two options

**Option A (recommended):** Use `chat:joined` → `data.messages` after socket connect.

**Option B:** `GET /api/proposals/:id/messages` on page load, then connect socket for live updates.

Do **not** double-load without deduping by `message.id`.

### 3. React hook (implemented)

See `src/hooks/useProposalChat.js`:

- `chat:joined` → `setMessages(data.messages || [])`
- `chat:message` → append with dedupe by `id`
- `loadOlder()` → `GET .../messages?before=<firstId>` for pagination

### 4. UI notes

- Scroll to bottom on new message
- “Load older messages” button when `hasMore` is true
- Distinguish Party A vs Party B bubbles by `senderRole` / `senderId`
- Activity Timeline stays separate — do not mix chat into activities

---

## Manual test

1. Run `npm run db:migrate:proposal-chat`
2. Approve a proposal (Party B linked)
3. Browser A: `partya@test.com` — send messages
4. Browser B: Party B user — reply
5. **Refresh both browsers** — old messages should still appear
6. Optional: `GET /api/proposals/25/messages` in Postman with Party A or B token

---

## Architecture

```
Party A / Party B browsers
         |
    Socket.io (live)
         |
    proposal-chat:{id}
         |
    proposal_chat_messages (MySQL)
         ^
    REST GET /messages (history / pagination)
```

- **Real-time:** Socket.io broadcast after DB insert
- **History:** Loaded on `chat:join` + REST for pagination
- **Presence:** In-memory only (who is online now)
- **Activities:** `/api/proposals/:id/activities` — formal milestones only

---

## Frontend files

| File | Purpose |
|------|---------|
| `src/hooks/useProposalChat.js` | Socket + history + pagination |
| `src/components/proposal/ProposalChatPanel.jsx` | Chat UI on proposal detail |
| `src/api/proposals.js` | `getProposalMessages()` REST helper |
| `src/pages/proposals/ProposalDetail.jsx` | Details / Chat tabs |

---

## Related docs

- `STEP5B_PARTY_B_API.md` — Party B account on approve
- `STEP9_PROPOSAL_ENGAGEMENT_API.md` — Proposal form & submit
- `STEP3_ACTIVITIES_API.md` — Formal activity timeline
