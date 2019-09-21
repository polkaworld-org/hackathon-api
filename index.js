const express = require('express');
const cors = require('cors');
const { naclVerify, encodeAddress } = require('@polkadot/util-crypto');

const port = process.env.PORT || 8081;

const app = express();

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync('data.json');
const db = low(adapter);

app.use(express.json());
app.use(cors());

app.get('/status', function(req, res) {
  res.send({
    result: db.get('status'),
  });
});

app.get('/detail', function(req, res) {
  res.send({
    result: db.get('vote'),
  });
});

app.post('/vote', function(req, res) {
  const requestData = req.body;

  let result;
  try {
    result = naclVerify(`${requestData.target}:${requestData.score}`, requestData.signature, requestData.publicKey);
  } catch {
    result = false;
  }

  const address = encodeAddress(requestData.publicKey);

  if (result) {
    const data = db
      .get(`vote`)
      .find({ target: requestData.target })
      .value();

    if (!data || isNaN(requestData.score)) {
      const msg = {
        error: {
          message: '验证错误',
        },
      };
      console.log(msg);
      res.send(msg);
    } else {
      const voteScore = db
        .get(`vote`)
        .find({ target: requestData.target })
        .get(`result.${address}`)
        .value();

      if (voteScore) {
        const msg = {
          error: {
            message: '不能重复投票',
          },
        };
        console.log(msg);
        res.send(msg);
      } else {
        db.get(`vote`)
          .find({ target: requestData.target })
          .get('result')
          .assign({ [address]: requestData.score })
          .write();

        const msg = {
          result: {
            message: '投票成功',
          },
        };
        console.log(`投票人：${address},投票项目：${requestData.target},分数: ${requestData.score}`);
        res.send(msg);
      }
    }
  } else {
    const msg = {
      error: {
        message: '验证错误',
      },
    };
    console.log(msg);
    res.send(msg);
  }
});

app.listen(port, () => console.log(`rpc ${port}`));
