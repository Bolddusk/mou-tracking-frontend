# Companies Tab — Party A & Party B (own side only)

**Backend ready** — use capabilities from `GET /api/proposals/:id`.

---

## 1. Show Companies tab

| Role | Show Companies tab? |
|------|---------------------|
| `super_admin` / `admin` / `sector_lead` | Yes — both edit flags |
| `party_a` (linked to this MOU) | **Yes** — `can_view_companies === true` |
| `party_b` (linked to this MOU) | **Yes** — `can_view_companies === true` |

```tsx
const showCompanies = proposal.capabilities?.can_view_companies === true;
// Tabs: Details | Companies (if showCompanies) | Updates | …
```

Do **not** hide Companies for `role === 'party_a'` or `role === 'party_b'`.

---

## 2. Edit buttons — split flags only

| Flag | Meaning |
|------|---------|
| `can_edit_party_a_contacts` | **Edit contacts** on Pakistani / Party A card |
| `can_edit_party_b_contacts` | **Edit contacts** on Chinese / Party B card |
| `can_edit_party_contacts` | Legacy staff-only both-sides. **Parties have this `false` — do not depend on it** |

| Role | Pakistani card Edit | Chinese card Edit |
|------|---------------------|-------------------|
| Party A | ✅ | ❌ |
| Party B | ❌ | ✅ |
| Staff | ✅ | ✅ |

### Party A

```json
{
  "capabilities": {
    "can_view_companies": true,
    "can_edit_party_a_contacts": true,
    "can_edit_party_b_contacts": false,
    "can_edit_party_contacts": false
  }
}
```

### Party B

```json
{
  "capabilities": {
    "can_view_companies": true,
    "can_edit_party_a_contacts": false,
    "can_edit_party_b_contacts": true,
    "can_edit_party_contacts": false
  }
}
```

```tsx
{caps.can_edit_party_a_contacts && <EditContactsButton side="a" />}
{caps.can_edit_party_b_contacts && <EditContactsButton side="b" />}
```

Each party **sees** the other side’s name/email (read-only) — no Edit on the other card.

---

## 3. Save API — own side only

```
PATCH /api/proposals/:id/party-contacts
```

### Party A body

```json
{
  "party_a_info": {
    "organization_name": "MA Group Pakistan",
    "contact_name": "M. Zain Abid Mian",
    "email": "trustherb@outlook.com",
    "phone": "0300…",
    "country": "Pakistan",
    "city": "Lahore"
  }
}
```

### Party B body

```json
{
  "party_b_info": {
    "organization_name": "Anhui SunGu Argitech Co., Ltd",
    "contact_name": "…",
    "email": "partyb@example.com",
    "phone": "…",
    "country": "China",
    "city": "…"
  }
}
```

**Do not send** the other side from party UIs — API returns `403` (e.g. *You cannot edit Party B contacts*).

Staff may send both `party_a_info` and `party_b_info`.

---

## 4. Email must be valid (login-safe)

Invalid: `trustherb@outlook.com1122` → `400 Invalid … email address…`  
Valid: `name@domain.com`

Show the API error in the form. Credentials modal only when `account_created && credentials` (see `EXISTING_PARTY_LINK_FRONTEND.md`).

---

## 5. Checklist

- [ ] Companies tab when `can_view_companies` (Party A **and** Party B)
- [ ] Pakistani Edit → `can_edit_party_a_contacts` only
- [ ] Chinese Edit → `can_edit_party_b_contacts` only
- [ ] Do **not** gate on `can_edit_party_contacts` for parties
- [ ] Party A PATCH → only `party_a_info`
- [ ] Party B PATCH → only `party_b_info`
- [ ] Invalid email → clear form error
- [ ] Staff: edit both sides

---

## Related

- `COMPANIES_TAB_FRONTEND.md` — layout / display
- `PROPOSAL_PARTY_CONTACTS_FRONTEND.md` — full contact payload (staff)
- `EXISTING_PARTY_LINK_FRONTEND.md` — credentials modal vs existing account
