# LocalStack Manager Dashboard 🚀

A premium, modern web dashboard to manage your LocalStack services (S3, SQS, DynamoDB, IAM, SES, KMS).

## 🌟 Features
- **Modern UI**: Sleek dark mode with glassmorphism effects.
- **Service Management**: List and view resources across 6 core AWS services.
- **Dynamic Config**: Automatically detects and displays your active AWS region and LocalStack endpoint.
- **Flexible Deployment**: Run via Docker Compose or locally with Node.js.

---

## 🚀 How to Run

### Method 1: Docker (Recommended)
The easiest way to get started is using Docker Compose. This will spin up both LocalStack and the Manager.

```bash
docker-compose up --build
```
Access the dashboard at: **[http://localhost:3001](http://localhost:3001)**

---

### Method 2: Local Development
If you prefer running it locally without a Docker image for the manager:

1. **Start LocalStack**:
   Ensure LocalStack is running (e.g., `docker-compose up localstack`).

2. **Install Dependencies**:
   ```bash
   npm run install:all
   ```

3. **Configure Environment (Optional)**:
   You can set the following environment variables:
   - `AWS_REGION`: The AWS region to use (default: `us-east-1`).
   - `LOCALSTACK_ENDPOINT`: The URL of your LocalStack instance (default: `http://localhost:4566`).

4. **Run the App**:
   ```bash
   npm run dev
   ```
   - **Frontend**: [http://localhost:5173](http://localhost:5173)
   - **Backend**: [http://localhost:3001](http://localhost:3001)

---

## 🛠️ Tech Stack
- **Frontend**: React, Vite, Framer Motion, Lucide Icons.
- **Backend**: Node.js, Express, AWS SDK v2.
- **Styling**: Vanilla CSS (Premium Design System).

## 📝 Verification
To see resources in the dashboard, create some in LocalStack first:
```bash
aws --endpoint-url=http://localhost:4566 s3 mb s3://my-test-bucket
```
Refresh the dashboard, and your bucket will appear!
