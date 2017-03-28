var fs = require('fs');
var youtubedl = require('youtube-dl');
var ytdl = require('ytdl-core');
var ffmpeg = require('fluent-ffmpeg');
var Client = require('node-rest-client').Client;
var mkdirp = require('mkdirp');

var fileWithVideoUrls = 'files1.txt';
var rootStorageDir = './'
var ffmpegPath ='./ffmpeg/ffmpeg';
var counterFrom = 1;
var isList = false;
var videos = [];
var originalLength = 0;
var pending = [];
if (process.argv.length <4) {
  console.log('usage: node downloader.js fileName rootStorageDir  counterFrom ffmpegPath [-l]');
  console.log('  fileName               : The file containing the youtube urls or the playlist Id');
  console.log('  rootStorageDir         : The directory to store the mp3 files');
  console.log('  counterFrom [optional] : The counter to start the songs from. Default: ' + counterFrom);
  console.log('  ffmpegPath [optional]  : The ffmpeg path. Default: ' + ffmpegPath);
  console.log('  -l                     : Is Playlist Id. Default :  ' + isList);
  return;
}

fileWithVideoUrls = process.argv[2];
rootStorageDir = process.argv[3];
if (process.argv.length > 4) {
  counterFrom = process.argv[4];
}
if (process.argv.indexOf('-l') > -1) {
  isList = true;  
}
if (!isList) {

  videos = readFile(fileWithVideoUrls);
  originalLength = videos.length;
  mkdirp(rootStorageDir, function(err) { 
    if (err !== null) {
      console.log('Error Making Dir: ' + rootStorageDir);
      return;
    }
    for (var i = 0; i < videos.length; i++) {
      var extractObj = {url:videos[i], fileName: counterFrom++};
      extractMP3(extractObj);
    }
  });

} else {


    mkdirp(rootStorageDir, function(err) { 
    if (err !== null) {
      console.log('Error Making Dir: ' + rootStorageDir);
      return;
    }
    getList(fileWithVideoUrls);

  });
      
   
}


function getList(fileWithVideoUrls, pageToken) {
  var page = '';
  if (pageToken!==undefined) {
    page = '&pageToken='+pageToken;
  }
      var client = new Client();
    client.get("https://www.googleapis.com/youtube/v3/playlistItems?maxResults=50&part=contentDetails&playlistId="+ fileWithVideoUrls+"&key=AIzaSyAf_7bmw1h9cWTj5yJ7WKEk3l-e8-p5prg"+page, function (data, response) {
      
      
      for (var i=0; i<data.items.length; i++) {
        videos.push(data.items[i]);
        var videoId = data.items[i].contentDetails.videoId;
        console.log(videoId);
        var extractObj = {url:'https://www.youtube.com/watch?v='+videoId, fileName: counterFrom++};
        console.log(extractObj);
        extractMP3(extractObj);
        //ytdl('http://www.youtube.com/watch?v=A02s8omM_hI')
        //.pipe(fs.createWriteStream('video.flv'));
      } 
      originalLength= videos.length;
      if (data.nextPageToken !== undefined) {
        console.log('next page:');
        console.log(data.nextPageToken);
        getList(fileWithVideoUrls, data.nextPageToken);
      }
       
        

    });
}
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
  downloadingCounter--;
  process.stdout.write("Done: " + percentage + " %" + " Counter : " + downloadingCounter);
  
  if (pending.length >0 && downloadingCounter <10) {
    console.log(' popping one!');

    extractMP3(pending.pop());
  }
  if (videos.length == 0 && pending.length == 0) {
    console.log('');
    console.log('Finished!');
    console.log('');
  }

}

var downloadingCounter = 0;
function extractMP3(extractObj) {
  console.log(extractObj.url);
 
  var client = new Client();
  
  if (downloadingCounter >= 10) {
    //console.log('downloading counter too large , sleeping...:' + downloadingCounter);
    console.log('adding to pending...');
    pending.push(extractObj);
    return;
  }
  downloadingCounter++;
   
  client.get("https://www.youtube.com/oembed?url=" + extractObj.url + "&format=json", function (data, response) {
     // console.log('GOT INFO!');
      var stream = ytdl(extractObj.url);
     // console.log(stream);
      var proc = new ffmpeg({source:stream});
      proc.url = extractObj.url;
      proc.setFfmpegPath(ffmpegPath);
      proc.audioBitrate(128);
      proc.on ('end', function( ) {
        finished(proc.url);
      });
      var title = data.title;
      if (title=== undefined) {
        console.log(extractObj.url + ' is title-undefined');
        title = 'UNTITLED'
      }
      proc.saveToFile(rootStorageDir + extractObj.fileName + ' - ' + title.replace("/", "--") + '.mp3',
        function (stdout, stderr) {
          console.log(stderr);
          console.log(stdout);    
        });
      

  });
}


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


