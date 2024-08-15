const express = require("express");
const userRouter = require("./routes/userRouter")
const app = express();
const port = 3000;

app.use(express.json());
app.use('/api/v1/user', userRouter);

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})