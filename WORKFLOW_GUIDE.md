# 🔄 Workflow System Guide

## Overview

The Agent Builder workflow system is a **fully functional automation engine** with:
- **Variable substitution** using `{{variable}}` syntax
- **Conditional logic** with multiple operators
- **Real API integrations** via OAuth
- **Data flow** between steps
- **Error handling** and step-by-step execution tracking

---

## 🎯 How It Works

### 1. **Variable System**

Variables use `{{variable}}` syntax and are resolved at runtime:

```
{{client_name}}           → "John Smith"
{{client_email}}          → "john@example.com"
{{trigger_data.amount}}   → "1000"
{{step_outputs.step1.id}} → "contact_12345"
```

**Available Variables:**
- **Input Context**: Any data passed when executing (e.g., `client_name`, `client_email`, `client_company`)
- **Trigger Data**: Data from webhooks stored in `trigger_data.*`
- **Step Outputs**: Results from previous steps via `step_outputs.{step_id}.*`
- **Custom Variables**: Set using "Set Variable" action

---

### 2. **Step Types**

#### **🟡 Triggers**
- Start point of workflow
- Validates incoming data
- Passes through trigger context

**Example:**
```json
{
  "type": "trigger",
  "label": "New Client Signup",
  "config": {}
}
```

#### **🟣 Conditions**
- Evaluate data and control flow
- Support multiple operators
- Can skip subsequent steps if false

**Operators:**
- `equals` - Exact match
- `not_equals` - Not equal
- `contains` - String contains
- `greater_than` - Numeric comparison
- `less_than` - Numeric comparison
- `exists` - Field has value
- `not_exists` - Field is empty/null

**Example:**
```json
{
  "type": "condition",
  "label": "Check if Premium Client",
  "config": {
    "field": "client_tier",
    "operator": "equals",
    "value": "premium"
  }
}
```

#### **🔵 Actions**
- Execute integrations or internal operations
- Support variable substitution in all fields
- Return data for use in subsequent steps

**Available Actions:**

**Zoho CRM:**
- `create_contact` - Create CRM contact
- `create_deal` - Create sales deal

**Google Workspace:**
- `send_email` - Send email via Gmail
- `create_calendar_event` - Create calendar event

**Slack:**
- `send_message` - Post to Slack channel

**Stripe:**
- `list_overdue_invoices` - Get overdue invoices

**Internal:**
- `create_task` - Create follow-up task
- `log_activity` - Log to activity feed
- `http_request` - Make HTTP API call
- `set_variable` - Store value for later use
- `delay` - Wait X seconds

---

### 3. **Building Workflows**

#### **Step 1: Create Workflow**
1. Go to Workflows page
2. Click "Create Workflow"
3. Enter name, description, trigger type

#### **Step 2: Add Steps**
1. Click "Add Trigger", "Add Condition", or "Add Action"
2. Click on step to edit
3. Configure step details

#### **Step 3: Configure Actions**

**Example: Send Welcome Email**
```
Integration: Google Workspace
Action: send_email

To: {{client_email}}
Subject: Welcome to our platform, {{client_name}}!
Body: Hi {{client_name}},

Thank you for signing up! We're excited to have you.

Best regards,
The Team
```

**Example: Create CRM Contact**
```
Integration: Zoho CRM
Action: create_contact

Data:
{
  "First_Name": "{{client_name}}",
  "Email": "{{client_email}}",
  "Company": "{{client_company}}",
  "Lead_Source": "Website"
}
```

**Example: Conditional Task**
```
Condition:
  Field: client_tier
  Operator: equals
  Value: premium

Action (if true):
  Action: create_task
  Title: Schedule onboarding call with {{client_name}}
  Days from now: 1
```

#### **Step 4: Reorder Steps**
- Use ↑↓ arrows to move steps
- Steps execute in order from top to bottom

#### **Step 5: Save & Execute**
- Click "Create Workflow"
- Execute manually or via webhook

---

## 🚀 Execution Flow

1. **Workflow Triggered**
   - Manual execution with input form
   - Webhook trigger with payload
   - Scheduled trigger (future)

2. **Context Initialized**
   ```javascript
   {
     workflow_id: "wf_123",
     workflow_name: "Client Onboarding",
     execution_id: "exec_456",
     client_name: "John Smith",
     client_email: "john@example.com",
     variables: {},
     step_outputs: {}
   }
   ```

3. **Steps Execute Sequentially**
   - Each step receives full context
   - Variables resolved before execution
   - Results stored in `step_outputs`
   - Errors halt execution

4. **Results Tracked**
   - Real-time progress updates
   - Per-step status (success/error/skipped)
   - Execution duration
   - Final result stored

---

## 📊 Real-World Examples

### Example 1: Client Onboarding

```
1. Trigger: New Client Signup
   - Receives: client_name, client_email, client_company

2. Action: Create Zoho CRM Contact
   - Creates contact with client details
   - Returns: contact_id

3. Action: Send Welcome Email
   - To: {{client_email}}
   - Subject: Welcome {{client_name}}!
   - Body: Personalized welcome message

4. Action: Notify Slack
   - Channel: #new-clients
   - Message: New client: {{client_name}} from {{client_company}}

5. Action: Create Follow-up Task
   - Title: Follow up with {{client_name}}
   - Due: 3 days from now
```

### Example 2: Invoice Reminder

```
1. Trigger: Daily Schedule

2. Action: Get Overdue Invoices (Stripe)
   - Returns: List of invoices

3. Condition: Has Overdue Invoices
   - Field: step_outputs.step2.count
   - Operator: greater_than
   - Value: 0

4. Action: Send Email (if true)
   - To: accounting@company.com
   - Subject: {{step_outputs.step2.count}} overdue invoices
   - Body: Invoice details...

5. Action: Create Task
   - Title: Review overdue invoices
   - Due: Today
```

### Example 3: Lead Qualification

```
1. Trigger: New Lead from Webhook
   - Receives: lead_email, company_size, budget

2. Condition: Qualified Lead
   - Field: budget
   - Operator: greater_than
   - Value: 10000

3. Action: Create Zoho Deal (if qualified)
   - Deal_Name: {{company_name}} - {{budget}}
   - Amount: {{budget}}
   - Stage: Qualification

4. Action: Assign to Sales Rep
   - Create task for sales team
   - Priority: High

5. Action: Log Activity
   - Message: Qualified lead: {{lead_email}} (Budget: ${{budget}})
```

---

## 🔐 Security

- **OAuth Tokens**: Stored server-side, never exposed to frontend
- **API Keys**: Environment variables only
- **Execution Context**: Isolated per workflow run
- **Error Handling**: Sensitive data not logged

---

## 🐛 Debugging

### Check Execution Status
1. Go to Workflows page
2. Click workflow to expand
3. View step-by-step results

### Common Issues

**Variables not resolving:**
- Check spelling: `{{client_name}}` not `{{clientName}}`
- Ensure variable exists in context
- Use step outputs: `{{step_outputs.step1.data.id}}`

**Integration errors:**
- Verify OAuth connection in Integrations page
- Check token hasn't expired
- Ensure correct permissions/scopes

**Condition not working:**
- Check operator matches data type
- Use `exists` for optional fields
- Test with simple equals first

---

## 📝 Best Practices

1. **Name Steps Clearly**
   - "Create CRM Contact" not "Action 1"
   - Helps debugging and maintenance

2. **Use Variables Everywhere**
   - Makes workflows reusable
   - Easier to update

3. **Add Conditions for Safety**
   - Check data exists before using
   - Validate email format
   - Confirm required fields

4. **Log Important Events**
   - Use "Log Activity" action
   - Track key decisions
   - Record errors

5. **Test with Real Data**
   - Execute with actual client info
   - Verify integrations work
   - Check task creation

---

## 🎓 Advanced Features

### Accessing Step Outputs

Previous step results are available:
```
{{step_outputs.step_create_contact.data.id}}
{{step_outputs.step_send_email.messageId}}
{{step_outputs.step_get_invoices.count}}
```

### Nested Variables

Access nested data:
```
{{trigger_data.customer.email}}
{{step_outputs.step1.response.data.0.id}}
```

### HTTP Requests

Make custom API calls:
```
Action: http_request
Method: POST
URL: https://api.example.com/webhooks
Headers: {"Authorization": "Bearer {{api_token}}"}
Body: {"event": "signup", "user": "{{client_email}}"}
```

### Dynamic Delays

Wait based on conditions:
```
Action: delay
Seconds: {{step_outputs.step1.wait_time}}
```

---

## 🚀 Next Steps

1. **Connect Integrations** - Set up OAuth for Zoho, Google, Slack
2. **Build First Workflow** - Start with simple 2-3 step workflow
3. **Test Execution** - Run with real data
4. **Monitor Results** - Check Tasks page for created tasks
5. **Iterate** - Add conditions, more actions, error handling

---

## 💡 Tips

- Start simple, add complexity gradually
- Use templates as starting points
- Test each step individually
- Monitor execution logs
- Keep workflows focused on single purpose

**Your workflows now execute real actions with real data!** 🎉
