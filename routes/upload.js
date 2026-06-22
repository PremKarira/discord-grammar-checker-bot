import express from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
import fs from "fs";
import { saveUpload, getUploads } from "../config/db.js";

const router = express.Router();

const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      if (!fs.existsSync("./temp_uploads")) {
        fs.mkdirSync("./temp_uploads");
      }

      cb(null, "./temp_uploads");
    },

    filename(req, file, cb) {
      cb(null, Date.now() + "-" + file.originalname);
    },
  }),

  limits: {
    fileSize: 200 * 1024 * 1024,
  },
});

function escapeHTML(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

router.get("/", async (req, res) => {
  const uploads = await getUploads();

  const rows = uploads
    .map(
      (file) => `

<tr>

<td>${escapeHTML(file.hex)}</td>

<td>${escapeHTML(file.filename)}</td>

<td>${escapeHTML(file.type)}</td>

<td>${escapeHTML(file.username)}</td>

<td>

<a href="${file.url}" target="_blank">
Open
</a>

</td>

</tr>

`,
    )
    .join("");

  res.send(`


<html>


<head>


<title>File Upload</title>


<style>


body {

background:#121212;

color:#eee;

font-family:Arial,sans-serif;

padding:30px;

}


.container{

max-width:1000px;

margin:auto;

}


.card{

background:#181818;

padding:20px;

border-radius:10px;

margin-bottom:20px;

}



input,
select,
button{

background:#1e1e1e;

color:white;

border:1px solid #444;

padding:10px;

border-radius:6px;

margin:5px;

}



button{

background:#5865F2;

border:none;

cursor:pointer;

}



.info{

color:#aaa;

}



table{

width:100%;

border-collapse:collapse;

background:#1b1b1b;

margin-top:20px;

}



th{

background:#252525;

}



td,th{

border:1px solid #444;

padding:10px;

}



a{

color:#00aaff;

}



.progress{

width:100%;

background:#333;

height:20px;

border-radius:5px;

overflow:hidden;

}



.bar{

height:100%;

width:0%;

background:#5865F2;

}



</style>


</head>



<body>


<div class="container">



<div class="card">


<h1>
Upload File
</h1>


<p class="info">

Maximum file size: 200MB

</p>



<form id="uploadForm">


<input

name="username"

placeholder="Discord Username"

required>


<br>


<input

type="file"

name="file"

required>


<br>


<select name="type" required>


<option value="image">
Image
</option>


<option value="video">
Video
</option>


</select>


<br>


<button>
Upload
</button>


</form>


<br>


<div class="progress">

<div id="bar" class="bar">

</div>

</div>


<p id="status"></p>



</div>





<div class="card">


<h2>
Available Files
</h2>



<table>


<tr>

<th>
Hex
</th>

<th>
Filename
</th>

<th>
Type
</th>

<th>
User
</th>

<th>
Link
</th>


</tr>


${rows || "<tr><td colspan='5'>No uploads</td></tr>"}


</table>


</div>




</div>




<script>


const form =
document.getElementById("uploadForm");



form.onsubmit=(e)=>{


e.preventDefault();



const data =
new FormData(form);



const xhr =
new XMLHttpRequest();



xhr.open(
"POST",
"/upload/file"
);



xhr.upload.onprogress=(e)=>{


if(e.lengthComputable){


let percent =
(e.loaded/e.total)*100;



document.getElementById("bar")
.style.width =
percent+"%";



document.getElementById("status")
.innerText =
"Uploading "+percent.toFixed(1)+"%";


}


};



xhr.onload=()=>{


if(xhr.status===200){


document.getElementById("status")
.innerText=
"Uploaded ✅ Check few seconds later for the file to appear in the list below.";


setTimeout(
()=>location.reload(),
1000
);


}

else{


document.getElementById("status")
.innerText=
xhr.responseText;


}


};



xhr.send(data);



};



</script>



</body>


</html>



`);
});

router.post(
  "/file",

  upload.single("file"),

  async (req, res) => {
    let filePath;

    try {
      if (!req.file) {
        return res.status(400).send("No file selected ❌");
      }

      if (!req.body.username) {
        return res.status(400).send("Username required ❌");
      }

      filePath = req.file.path;

      console.log("File received:", req.file.originalname);

      const form = new FormData();

      form.append(
        "fileToUpload",

        fs.createReadStream(filePath),

        req.file.originalname,
      );

      form.append(
        "reqtype",

        "fileupload",
      );

      const catbox = await axios.post(
        "https://catbox.moe/user/api.php",

        form,

        {
          headers: form.getHeaders(),

          timeout: 120000,
        },
      );

      const url = catbox.data;

      if (!url.startsWith("http")) {
        throw new Error("Catbox failed: " + url);
      }

      const hex = crypto.randomBytes(4).toString("hex");

      await saveUpload({
        hex,

        username: req.body.username,

        filename: req.file.originalname,

        url,

        type: req.body.type,

        createdAt: new Date(),
      });

      res.send("ok");
    } catch (err) {
      console.log("UPLOAD ERROR:", err.message);

      res.status(500).send(err.message);
    } finally {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  },
);

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).send("File too large ❌ Max 200MB");
    }
  }

  next(err);
});

export default router;
