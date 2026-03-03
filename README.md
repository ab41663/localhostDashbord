# LocalStack Manager Dashboard 🚀

A premium, modern web dashboard to manage your LocalStack services (S3, SQS, DynamoDB, IAM, KMS).

## 🌟 Features
- **Modern UI**: Sleek AWS-inspired design with premium aesthetics and responsive layouts.
- **Service Management**: Full management for **S3, SQS, DynamoDB, IAM, and SSM**.
- **DynamoDB JSON Editor**: Create and edit items using a professional JSON modal with multiline support.
- **Smart Search**: Find DynamoDB items by searching any attribute with automatic type detection (String/Number/Boolean).
- **Sticky Actions**: Consistent action toolbars and selection models for better readability of wide datasets.
- **IAM Details**: Deep-dive into IAM roles and policy JSON directly from the console.
- **Dynamic Config**: Automatically detects and displays your active AWS region and LocalStack endpoint.
- **Deployment**: Local and Docker-ready for any development environment.

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
- **Frontend**: React, Vite, Framer Motion, AWS SVG Architecture Icons.
- **Backend**: Node.js, Express, AWS SDK v2, DynamoDB Document Client.
- **Styling**: Vanilla CSS (AWS Design System).

## 📝 Verification
To see resources in the dashboard, create some in LocalStack first:
```bash
aws --endpoint-url=http://localhost:4566 s3 mb s3://my-test-bucket
```
Refresh the dashboard, and your bucket will appear!
