# Google Forms Dynamic Renderer

A Next.js application that dynamically renders Google Forms by fetching form structure from the Google Forms API and building a form interface based on the form's contents. The form is fetched at build time using `getStaticProps` for optimal performance.

## Features

- 🔄 Fetches form structure from Google Forms API at build time
- 🎨 Dynamically renders form fields based on form type
- ✅ Supports multiple question types:
  - Text (short answer and paragraph)
  - Multiple choice (radio, checkbox, dropdown)
  - Scale questions
  - Date and time questions
  - File uploads
  - Grid/Matrix questions
- 📱 Responsive design with Tailwind CSS
- 🔒 Form validation with React Hook Form
- ⚡ Static generation with ISR (Incremental Static Regeneration)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Google Cloud Platform (GCP) Setup

To fetch real Google Forms data, you need to set up Google Forms API credentials. We'll use a **Service Account** which is the recommended approach for server-side applications.

#### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter a project name (e.g., "google-forms-renderer")
5. Click "Create"

#### Step 2: Enable Google Forms API

1. In your project, navigate to **"APIs & Services" > "Library"**
2. Search for **"Google Forms API"**
3. Click on it and click **"Enable"**

#### Step 3: Create a Service Account

1. Navigate to **"APIs & Services" > "Credentials"**
2. Click **"Create Credentials"** > **"Service Account"**
3. Fill in the details:
   - **Service account name**: `forms-reader` (or any name you prefer)
   - **Service account ID**: Will be auto-generated
   - **Description**: "Service account for reading Google Forms"
4. Click **"Create and Continue"**
5. Skip the optional steps (Grant access, Grant users access) and click **"Done"**

#### Step 4: Create and Download Service Account Key

1. In the **"Credentials"** page, find your newly created service account
2. Click on the service account email
3. Go to the **"Keys"** tab
4. Click **"Add Key"** > **"Create new key"**
5. Select **"JSON"** format
6. Click **"Create"** - this will download a JSON file to your computer
7. **Important**: Keep this file secure and never commit it to version control!

#### Step 5: Share Your Google Form with the Service Account

1. Open your Google Form (e.g., `https://forms.gle/ZKrSszkL1yry7zr4A`)
2. Click the **"Send"** button (top right)
3. Click the **"Link"** icon (chain link icon)
4. Click **"Change"** next to "Restrict to users in [Your Organization]"
5. Select **"Anyone with the link"** (or ensure the service account has access)
6. **More importantly**:
   - Go to your form's settings (three dots menu > Settings)
   - Or go directly to the form editor
   - Click **"Share"** button (top right)
   - In the "Add people and groups" field, paste the **service account email** (found in the JSON file as `client_email`, or in GCP Console)
   - Give it **"Viewer"** access
   - Click **"Send"** or **"Share"**

#### Step 6: Configure Environment Variables

1. Create a `.env.local` file in the root directory (if it doesn't exist)
2. Add your service account credentials. You have **three options**:

   **Option A: Full Service Account JSON (Recommended)**

   ```env
   GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"your-service-account@your-project.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}'
   ```

   **Option B: Individual Fields (Alternative)**

   ```env
   GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

   **Option C: OAuth2 Access Token (For testing only)**

   ```env
   GOOGLE_FORMS_ACCESS_TOKEN=your_access_token_here
   ```

3. Set the form URL (optional, defaults to the one in code):
   ```env
   GOOGLE_FORM_URL=https://forms.gle/ZKrSszkL1yry7zr4A
   ```

#### Step 7: Extract Service Account Email

The service account email is in the downloaded JSON file under `client_email`. It looks like:

```
your-service-account@your-project-id.iam.gserviceaccount.com
```

**This is the email you need to share your Google Form with!**

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The form will be fetched at build time using `getStaticProps`, so you'll see it immediately.

### 4. Build for Production

```bash
npm run build
npm start
```

The form data is fetched during the build process and statically generated. It will revalidate every hour (configurable in `getStaticProps`).

## Troubleshooting

### Error: "Form not found" or "Permission denied"

1. **Make sure the form is shared with the service account:**

   - Open your Google Form
   - Click "Share" button
   - Add the service account email (from the JSON file, `client_email` field)
   - Give it "Viewer" access

2. **Verify the form ID is correct:**

   - Check that `GOOGLE_FORM_URL` matches your form URL
   - The form ID is extracted from the URL automatically

3. **Check your credentials:**
   - Ensure `.env.local` has the correct service account key
   - Verify the JSON is properly formatted (if using Option A)
   - Make sure private key includes `\n` characters (if using Option B)

### Error: "No Google authentication credentials found"

- Make sure `.env.local` exists and has one of the credential options set
- Restart your development server after adding environment variables
- Check that variable names match exactly (case-sensitive)

### Form not updating after changes

- The form uses ISR (Incremental Static Regeneration) with a 1-hour revalidate period
- To force a rebuild, restart the server or rebuild the app
- You can adjust the `revalidate` time in `src/pages/index.tsx`

## Project Structure

```
src/
├── components/
│   └── DynamicForm.tsx      # Main form renderer component
├── lib/
│   ├── googleAuth.ts        # Google authentication utilities
│   └── googleForms.ts       # Utility functions for Google Forms
├── pages/
│   ├── api/
│   │   └── forms/
│   │       └── [formId].ts  # API route to fetch form data
│   └── index.tsx            # Main page with getStaticProps
├── types/
│   └── googleForms.ts       # TypeScript types for Google Forms
└── styles/
    └── globals.css          # Global styles
```

## API Endpoints

### GET `/api/forms/[formId]`

Fetches form data from Google Forms API (uses the same authentication).

**Query Parameters:**

- `formId`: Google Form ID or URL

**Response:**

- Returns a `GoogleForm` object with form structure

## Supported Form Field Types

- **Text Questions**: Short answer and paragraph text
- **Choice Questions**: Radio buttons, checkboxes, and dropdowns
- **Scale Questions**: Linear scale with labels
- **Date Questions**: Date and datetime inputs
- **Time Questions**: Time inputs
- **File Upload**: File input fields
- **Grid Questions**: Matrix/grid questions with rows and columns

## Environment Variables

| Variable                             | Required | Description                                   |
| ------------------------------------ | -------- | --------------------------------------------- |
| `GOOGLE_SERVICE_ACCOUNT_KEY`         | Yes\*    | Full JSON service account key (Option A)      |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL`       | Yes\*    | Service account email (Option B)              |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Yes\*    | Service account private key (Option B)        |
| `GOOGLE_FORMS_ACCESS_TOKEN`          | Yes\*    | OAuth2 access token (Option C, testing only)  |
| `GOOGLE_FORM_URL`                    | No       | Google Form URL (defaults to hardcoded value) |

\*At least one authentication method is required

## Technologies Used

- Next.js 16 (with `getStaticProps` and ISR)
- React 19
- TypeScript
- Tailwind CSS
- React Hook Form
- Google APIs Client Library (googleapis)

## Security Notes

- **Never commit** your service account JSON file or `.env.local` to version control
- Add `.env.local` to `.gitignore` (should already be there)
- Service account keys have access to your Google resources - keep them secure
- For production, consider using a secrets management service (e.g., Vercel Environment Variables, AWS Secrets Manager)

## License

MIT
