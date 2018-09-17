'use strict';

const awaitWriteStream = require('await-stream-ready').write;
const fs = require('fs');
const path = require('path');
const formidable = require("formidable");
const { spawn, fork, exec } = require('child_process');
const sendToWormhole = require('stream-wormhole');
const config = require('../../config/config.default');
const mongoose = require('../tool/mongodb');

// mongoose.connect(config.mongodb); 
// let db = mongoose.connection;
// db.on('error', console.error.bind(console, '连接失败'));
// // db.once('open', function() {
// // we're connected!
//   console.log('已连接')
  // //创建一个场景
  // let kittySchema = mongoose.Schema({ name: String });
  // kittySchema.methods.speak = () => {
  //   this.word = '我是一只猫';
  //   console.log(this.word,'----')
  // }
  // let Kitten = mongoose.model('Kitten', kittySchema);
  // var fluffy = new Kitten({ name: 'fluffy' });
  // fluffy.save((err, fluffy) => {
  //   if(err) {
  //     console.log('保存到数据库失败',err);
  //   }

  //   fluffy.speak();

  // })
  // Kitten.find(function (err, kittens) {
  //   if (err) return console.error(err);
  //   console.log(kittens);
  // })
// });

//解决文件上传
let fileUpload = (req) => {
  const form = new formidable.IncomingForm();
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      resolve({ fields, files })
    })
  });
}

/** 开始解压文件
* @param { fileName, versionPath, version, systemName}
* @return null;
* 
*/
let startFileUnpack = async (fileName, versionPath, version, systemName) => {
 return new Promise((resolve, reject) => {
   let unPack = spawn('tar', ['-x','-v', '-f',fileName],{ cwd: versionPath });
   let pid = unPack.pid;

   unPack.stdout.on('data', (data) => {
     console.log(`${data}`);
   });
   
   unPack.stderr.on('data', (data) => {
     console.log(`${data}`);
   });
   
   unPack.on('close', (code) => {
    //  let arr = fs.readFileSync(path.join(__dirname, '../pid/list.json'),{
    //    encoding: 'UTF8'
    //  });
    //  arr = arr ? JSON.parse(arr) : [];
    //  arr.push({
    //    version: version,
    //    name: systemName,
    //    pid: pid
    //  });
     
    //  fs.writeFileSync(path.join(__dirname, '../pid/list.json'), JSON.stringify(arr));
    let mongoose = mongoose();
     resolve();
   });
 })

}

//开始部署应用
let startIssue = (versionPath) => {
  return new Promise((resolve, reject) => {
    let unPack = spawn('npm', ['start'],{ cwd: versionPath });
    let pid = unPack.pid;

    unPack.stdout.on('data', (data) => {
      console.log(`${data}`);
    });
    
    unPack.stderr.on('data', (data) => {
      console.log(`${data}`);
    });
    unPack.on('close', (code) => {
      console.log('当前版本已部署');
      resolve();
    })
  });
}


//接收到文件上传请求
exports.unpack = async (req, url) => {

  const fileObj = await fileUpload(req);
  let name = fileObj.files.file.name;
  let file = fileObj.files.file;

  let fileName = name.split('_')[0];
  let version = name.split('_')[1].split('.gz')[0];
  let systemPath = path.join(__dirname, `../../system/${fileName}`);
  let versionPath = path.join(__dirname, `../../system/${fileName}/${version}`);

  //创建文件夹
  if(fs.existsSync(versionPath)) {
    return {
      code: 500,
      data: null,
      message: '当前版本已存在，请直接发布'
    }
  } else {
    try {
      fs.mkdirSync(versionPath);
    } catch (error) {

      fs.mkdirSync(systemPath);
      fs.mkdirSync(versionPath);
    }
  }
  //生成文件
  const stream = fs.createReadStream(file.path);
  const writeStream = fs.createWriteStream(path.join(versionPath, `${fileName}.gz`));
  try {
    //异步把文件流 写入
    await awaitWriteStream(stream.pipe(writeStream));
    await startFileUnpack(`${fileName}.gz`, versionPath, version, name);
    await startIssue(versionPath);
    return {
      code: 500,
      data: null,
      message: '部署成功'
    }
  } catch (err) {
    return {
      code: 500,
      data: null,
      message: err
    };
  }
}

