
## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` and add your Gemini API key.

3. Run the app:
   ```bash
   npm run dev
   ```

## Deploy to Netlify

### Option 1: Deploy from Git Repository

1. Push your code to a Git repository (GitHub, GitLab, etc.)

2. Go to [Netlify](https://netlify.com) and sign in

3. Click "New site from Git" and connect your repository

4. Configure build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`

5. Add environment variables in Netlify:
   - Go to Site settings → Environment variables
   - Add `GEMINI_API_KEY` with your actual API key

6. Deploy! Netlify will automatically build and deploy your site.

### Option 2: Manual Deploy

1. Build the project locally:
   ```bash
   npm run build
   ```

2. Go to [Netlify](https://netlify.com) and drag the `dist` folder to the deploy area

3. After deployment, add your environment variables:
   - Go to Site settings → Environment variables
   - Add `GEMINI_API_KEY` with your actual API key

4. Redeploy to apply the environment variables

### Environment Variables

Make sure to set the following environment variable in Netlify:

- `GEMINI_API_KEY`: Your Google Gemini API key

You can get a Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey).

### Node.js Version

This project requires Node.js 20 or higher. The deployment is configured to use Node 20 automatically via:
- `.nvmrc` file
- `netlify.toml` configuration
- `package.json` engines field
