const express = require('express');
const AWS = require('aws-sdk');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');

const upload = multer();
const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'dist')));


// LocalStack configuration
const awsConfig = {
    endpoint: process.env.LOCALSTACK_ENDPOINT || 'http://127.0.0.1:4566',
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: 'test',
    secretAccessKey: 'test',
    s3ForcePathStyle: true,
};

AWS.config.update(awsConfig);

// Route to get current config
app.get('/api/config', (req, res) => {
    res.json({ region: awsConfig.region, endpoint: awsConfig.endpoint });
});

const s3 = new AWS.S3();
const sqs = new AWS.SQS();
const dynamodb = new AWS.DynamoDB();
const iam = new AWS.IAM();
const ses = new AWS.SES();
const ssm = new AWS.SSM();

// Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', endpoint: awsConfig.endpoint });
});

// S3 Routes - Buckets
app.get('/api/s3/buckets', async (req, res) => {
    try {
        const data = await s3.listBuckets().promise();
        res.json(data.Buckets);
    } catch (err) {
        console.error('S3 ListBuckets Error Details:', {
            message: err.message,
            code: err.code,
            statusCode: err.statusCode,
            endpoint: s3.endpoint.href
        });
        res.status(500).json({ error: err.message || 'Unknown S3 error' });
    }
});

app.post('/api/s3/buckets', async (req, res) => {
    try {
        const { bucketName } = req.body;
        if (!bucketName) throw new Error('Bucket name is required');
        await s3.createBucket({ Bucket: bucketName }).promise();
        res.json({ message: `Bucket ${bucketName} created` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/s3/buckets/:name', async (req, res) => {
    try {
        const bucketName = req.params.name;
        await s3.deleteBucket({ Bucket: bucketName }).promise();
        res.json({ message: `Bucket ${bucketName} deleted` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// S3 Routes - Objects
app.get('/api/s3/buckets/:name/objects', async (req, res) => {
    try {
        const bucketName = req.params.name;
        const data = await s3.listObjectsV2({ Bucket: bucketName }).promise();
        res.json(data.Contents || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/s3/buckets/:name/objects', upload.single('file'), async (req, res) => {
    try {
        const bucketName = req.params.name;
        const file = req.file;
        if (!file) throw new Error('No file uploaded');
        const params = {
            Bucket: bucketName,
            Key: file.originalname,
            Body: file.buffer,
        };
        await s3.upload(params).promise();
        res.json({ message: `File ${file.originalname} uploaded` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/s3/buckets/:name/objects/:key', async (req, res) => {
    try {
        const params = {
            Bucket: req.params.name,
            Key: req.params.key,
        };
        const data = await s3.getObject(params).promise();
        res.send(data.Body);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/s3/buckets/:name/objects/:key', async (req, res) => {
    try {
        const params = {
            Bucket: req.params.name,
            Key: req.params.key,
        };
        await s3.deleteObject(params).promise();
        res.json({ message: `Object ${req.params.key} deleted` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// SQS Routes
app.get('/api/sqs/queues', async (req, res) => {
    try {
        const data = await sqs.listQueues().promise();
        const urls = data.QueueUrls || [];
        // Fetch attributes for each queue to get message counts
        const queuesWithAttributes = await Promise.all(urls.map(async (url) => {
            const attrData = await sqs.getQueueAttributes({
                QueueUrl: url,
                AttributeNames: ['ApproximateNumberOfMessages']
            }).promise();
            return {
                url,
                messageCount: attrData.Attributes.ApproximateNumberOfMessages
            };
        }));
        res.json(queuesWithAttributes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/sqs/queues', async (req, res) => {
    try {
        const { queueName } = req.body;
        if (!queueName) throw new Error('Queue name is required');
        const data = await sqs.createQueue({ QueueName: queueName }).promise();
        res.json({ message: `Queue ${queueName} created`, url: data.QueueUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/sqs/queues', async (req, res) => {
    try {
        const { queueUrl } = req.query;
        if (!queueUrl) throw new Error('Queue URL is required');
        await sqs.deleteQueue({ QueueUrl: queueUrl }).promise();
        res.json({ message: `Queue deleted` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/sqs/messages', async (req, res) => {
    try {
        const { queueUrl, messageBody } = req.body;
        await sqs.sendMessage({ QueueUrl: queueUrl, MessageBody: messageBody }).promise();
        res.json({ message: 'Message sent' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/sqs/messages', async (req, res) => {
    try {
        const { queueUrl, maxMessages, delete: shouldDelete } = req.query;
        if (!queueUrl) throw new Error('Queue URL is required');

        const count = parseInt(maxMessages, 10) || 1;
        const boundedCount = Math.min(Math.max(count, 1), 10);

        const data = await sqs.receiveMessage({
            QueueUrl: queueUrl,
            MaxNumberOfMessages: boundedCount,
            WaitTimeSeconds: 1 // short poll for UI responsiveness
        }).promise();

        let messages = data.Messages || [];
        if (messages.length > boundedCount) {
            messages = messages.slice(0, boundedCount);
        }

        if (shouldDelete === 'true' && messages.length > 0) {
            const deleteParams = {
                QueueUrl: queueUrl,
                Entries: messages.map(msg => ({
                    Id: msg.MessageId,
                    ReceiptHandle: msg.ReceiptHandle
                }))
            };
            await sqs.deleteMessageBatch(deleteParams).promise();
        }

        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/sqs/purge', async (req, res) => {
    try {
        const { queueUrl } = req.body;
        if (!queueUrl) throw new Error('Queue URL is required');
        await sqs.purgeQueue({ QueueUrl: queueUrl }).promise();
        res.json({ message: 'Queue purged' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DynamoDB Routes
app.get('/api/dynamodb/tables', async (req, res) => {
    try {
        const data = await dynamodb.listTables().promise();
        res.json(data.TableNames);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/dynamodb/tables', async (req, res) => {
    try {
        const { tableName, partitionKey, partitionKeyType = 'S', sortKey, sortKeyType = 'S', gsis = [] } = req.body;

        if (!tableName || !partitionKey) {
            throw new Error('Table Name and Partition Key are required.');
        }

        const attributeDefinitions = [
            { AttributeName: partitionKey, AttributeType: partitionKeyType }
        ];

        const keySchema = [
            { AttributeName: partitionKey, KeyType: 'HASH' }
        ];

        if (sortKey) {
            attributeDefinitions.push({ AttributeName: sortKey, AttributeType: sortKeyType });
            keySchema.push({ AttributeName: sortKey, KeyType: 'RANGE' });
        }

        const params = {
            TableName: tableName,
            AttributeDefinitions: attributeDefinitions,
            KeySchema: keySchema,
            ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
        };

        if (gsis && gsis.length > 0) {
            params.GlobalSecondaryIndexes = gsis.map(gsi => {
                const gsiKeySchema = [{ AttributeName: gsi.partitionKey, KeyType: 'HASH' }];

                // Add GSI attributes if they aren't already in the main table definition
                if (!attributeDefinitions.find(ad => ad.AttributeName === gsi.partitionKey)) {
                    attributeDefinitions.push({ AttributeName: gsi.partitionKey, AttributeType: gsi.partitionKeyType || 'S' });
                }

                if (gsi.sortKey) {
                    gsiKeySchema.push({ AttributeName: gsi.sortKey, KeyType: 'RANGE' });
                    if (!attributeDefinitions.find(ad => ad.AttributeName === gsi.sortKey)) {
                        attributeDefinitions.push({ AttributeName: gsi.sortKey, AttributeType: gsi.sortKeyType || 'S' });
                    }
                }

                return {
                    IndexName: gsi.indexName,
                    KeySchema: gsiKeySchema,
                    Projection: { ProjectionType: 'ALL' },
                    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
                };
            });
        }

        await dynamodb.createTable(params).promise();
        res.json({ message: `Table ${tableName} created` });
    } catch (err) {
        console.error('Error creating table:', err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/dynamodb/tables/:name', async (req, res) => {
    try {
        await dynamodb.deleteTable({ TableName: req.params.name }).promise();
        res.json({ message: `Table ${req.params.name} deleted` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DynamoDB Items
const docClient = new AWS.DynamoDB.DocumentClient();

app.get('/api/dynamodb/tables/:name/items', async (req, res) => {
    try {
        const data = await docClient.scan({ TableName: req.params.name, Limit: 50 }).promise();
        res.json(data.Items || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/dynamodb/tables/:name/search', async (req, res) => {
    try {
        const { partitionKey, partitionValue } = req.body;
        if (!partitionKey || !partitionValue) throw new Error('Attribute name and value are required');

        // Try to parse numeric or boolean values
        let searchVal = partitionValue;
        if (partitionValue === 'true') searchVal = true;
        else if (partitionValue === 'false') searchVal = false;
        else if (!isNaN(partitionValue) && partitionValue.trim() !== '') searchVal = Number(partitionValue);

        const params = {
            TableName: req.params.name,
            FilterExpression: '#attr = :val',
            ExpressionAttributeNames: { '#attr': partitionKey },
            ExpressionAttributeValues: { ':val': searchVal }
        };
        const data = await docClient.scan(params).promise();
        res.json(data.Items || []);
    } catch (err) {
        console.error('DynamoDB Search Error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/dynamodb/tables/:name/items', async (req, res) => {
    try {
        const { item } = req.body;
        if (!item || typeof item !== 'object') throw new Error('Valid JSON object required for item');

        const params = {
            TableName: req.params.name,
            Item: item
        };
        await docClient.put(params).promise();
        res.json({ message: `Item added/updated` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/dynamodb/tables/:name/items', async (req, res) => {
    try {
        const { key } = req.body;
        if (!key || typeof key !== 'object') throw new Error('Valid key object required for deletion');

        const params = {
            TableName: req.params.name,
            Key: key
        };
        await docClient.delete(params).promise();
        res.json({ message: `Item deleted` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// IAM Routes
app.get('/api/iam/users', async (req, res) => {
    try {
        const data = await iam.listUsers().promise();
        res.json(data.Users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/iam/users', async (req, res) => {
    try {
        const { userName } = req.body;
        await iam.createUser({ UserName: userName }).promise();
        res.json({ message: `User ${userName} created` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/iam/users/:name', async (req, res) => {
    try {
        await iam.deleteUser({ UserName: req.params.name }).promise();
        res.json({ message: `User ${req.params.name} deleted` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// IAM Roles
app.get('/api/iam/roles', async (req, res) => {
    try {
        const data = await iam.listRoles().promise();
        res.json(data.Roles || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/iam/roles', async (req, res) => {
    try {
        const { roleName, assumeRolePolicyDocument } = req.body;
        // Basic AssumeRolePolicy for EC2 if not provided
        const policyDoc = assumeRolePolicyDocument || JSON.stringify({
            Version: "2012-10-17",
            Statement: [{ Effect: "Allow", Principal: { Service: "ec2.amazonaws.com" }, Action: "sts:AssumeRole" }]
        });
        await iam.createRole({ RoleName: roleName, AssumeRolePolicyDocument: policyDoc }).promise();
        res.json({ message: `Role ${roleName} created` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/iam/roles/:name', async (req, res) => {
    try {
        await iam.deleteRole({ RoleName: req.params.name }).promise();
        res.json({ message: `Role ${req.params.name} deleted` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// IAM Policies
app.get('/api/iam/policies', async (req, res) => {
    try {
        const data = await iam.listPolicies({ Scope: 'Local' }).promise();
        res.json(data.Policies || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/iam/policies', async (req, res) => {
    try {
        const { policyName, policyDocument } = req.body;
        const doc = policyDocument || JSON.stringify({
            Version: "2012-10-17",
            Statement: [{ Effect: "Allow", Action: "*", Resource: "*" }]
        });
        await iam.createPolicy({ PolicyName: policyName, PolicyDocument: doc }).promise();
        res.json({ message: `Policy ${policyName} created` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/iam/policies/:arn', async (req, res) => {
    try {
        const param = decodeURIComponent(req.params.arn);
        await iam.deletePolicy({ PolicyArn: param }).promise();
        res.json({ message: 'Policy deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/iam/policy-detail', async (req, res) => {
    try {
        const arn = req.query.arn;
        if (!arn) return res.status(400).json({ error: 'ARN is required' });

        const policyData = await iam.getPolicy({ PolicyArn: arn }).promise();
        const versionData = await iam.getPolicyVersion({
            PolicyArn: arn,
            VersionId: policyData.Policy.DefaultVersionId
        }).promise();

        let rawDoc = versionData.PolicyVersion.Document;
        let formattedDoc = '';

        if (typeof rawDoc === 'string') {
            try {
                const decoded = rawDoc.includes('%') ? decodeURIComponent(rawDoc) : rawDoc;
                formattedDoc = JSON.stringify(JSON.parse(decoded), null, 2);
            } catch (e) {
                formattedDoc = rawDoc;
            }
        } else if (typeof rawDoc === 'object') {
            formattedDoc = JSON.stringify(rawDoc, null, 2);
        } else {
            formattedDoc = String(rawDoc);
        }

        res.json({ document: formattedDoc });
    } catch (err) {
        console.error('Error fetching policy version:', err);
        res.status(500).json({ error: err.message });
    }
});

// IAM Role Policy Attachments
app.get('/api/iam/roles/:name/policies', async (req, res) => {
    try {
        const data = await iam.listAttachedRolePolicies({ RoleName: req.params.name }).promise();
        res.json(data.AttachedPolicies || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/iam/roles/:name/policies', async (req, res) => {
    try {
        const { policyArn } = req.body;
        await iam.attachRolePolicy({ RoleName: req.params.name, PolicyArn: policyArn }).promise();
        res.json({ message: 'Policy attached' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/iam/roles/:name/policies/:arn', async (req, res) => {
    try {
        const arn = decodeURIComponent(req.params.arn);
        await iam.detachRolePolicy({ RoleName: req.params.name, PolicyArn: arn }).promise();
        res.json({ message: 'Policy detached' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// SES Routes
app.get('/api/ses/identities', async (req, res) => {
    try {
        const data = await ses.listIdentities().promise();
        res.json(data.Identities);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/ses/identities', async (req, res) => {
    try {
        const { email } = req.body;
        await ses.verifyEmailIdentity({ EmailAddress: email }).promise();
        res.json({ message: `Identity ${email} verification initiated` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/ses/identities/:email', async (req, res) => {
    try {
        await ses.deleteIdentity({ Identity: req.params.email }).promise();
        res.json({ message: `Identity ${req.params.email} deleted` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// SSM Routes
app.get('/api/ssm/parameters', async (req, res) => {
    try {
        const data = await ssm.describeParameters().promise();
        res.json(data.Parameters || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/ssm/parameters', async (req, res) => {
    try {
        const { name, value, type } = req.body;
        await ssm.putParameter({ Name: name, Value: value, Type: type || 'String', Overwrite: true }).promise();
        res.json({ message: `Parameter ${name} saved` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/ssm/parameters/:name', async (req, res) => {
    try {
        await ssm.deleteParameter({ Name: req.params.name }).promise();
        res.json({ message: `Parameter ${req.params.name} deleted` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// All other GET requests not handled before will return the React app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
