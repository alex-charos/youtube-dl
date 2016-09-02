var fs = require('fs');
var youtubedl = require('youtube-dl');
var ytdl = require('ytdl');
var ffmpeg = require('fluent-ffmpeg');
var Client = require('node-rest-client').Client;
var mkdirp = require('mkdirp');

var fileWithVideoUrls = 'files1.txt';
var rootStorageDir = './'
var ffmpegPath ='./ffmpeg/ffmpeg';
if (process.argv.length <4) {
  console.log('usage: node downloader.js fileName rootStorageDir ffmpegPath');
  console.log('  fileName:                The file containing the youtube urls');
  console.log('  rootStorageDir:          The directory to store the mp3 files');
  console.log('  ffmpegPath [optional]:   The ffmpeg path. Default: ' + ffmpegPath);
  return;
}

fileWithVideoUrls = process.argv[2];
rootStorageDir = process.argv[3];
  

var videos = readFile(fileWithVideoUrls);
var originalLength = videos.length;
mkdirp(rootStorageDir, function(err) { 
  if (err !== null) {
    console.log('Error Making Dir: ' + rootStorageDir);
    return;
  }
  for (var i = 0; i < videos.length; i++) {
    var extractObj = {url:videos[i], fileName: i+1};
    extractMP3(extractObj);
  }
});

function readFile(filename){
  return fs.readFileSync(filename).toString().split("\n");
}

var i =0;
function finished(url) {
  var index = videos.indexOf(url);
  videos.splice(index,1);
  process.stdout.clearLine();  // clear current text
  process.stdout.cursorTo(0); 
  var percentage = (originalLength-videos.length)/originalLength;
  percentage = percentage.toFixed(2) * 100;
  process.stdout.write("Done: " + percentage + " %");

  if (videos.length == 0) {
    console.log('');
    console.log('Finished!');
    console.log('');
  }

}


function extractMP3(extractObj) {
  console.log(extractObj.url);
  var stream = ytdl(extractObj.url);
  var client = new Client();
  client.get("https://www.youtube.com/oembed?url=" + extractObj.url + "&format=json", function (data, response) {
      var proc = new ffmpeg({source:stream});
      proc.url = extractObj.url;
      proc.setFfmpegPath(ffmpegPath);
      proc.on ('end', function( ) {
        finished(proc.url);
      })
      proc.saveToFile(rootStorageDir + extractObj.fileName + ' - ' + data.title.replace("/", "--") + '.mp3',
        function (stdout, stderr) {
          console.log(stderr);
          console.log(stdout);    
        });
      

  });
}


