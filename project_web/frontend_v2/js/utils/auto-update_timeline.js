// File: js/utils/youtube-timeline.js

var player;
var timeUpdater;

function onYouTubeIframeAPIReady() {
  var originUrl = window.location.origin;
  player = new YT.Player("youtube-player", {
    height: "100%",
    width: "100%",
    videoId: VIDEO_ID, // Biến này sẽ được truyền từ thẻ HTML
    playerVars: { playsinline: 1, rel: 0, origin: originUrl },
    events: {
      onReady: function (event) {
        console.log("Video ready");
      },
      onError: function (event) {
        console.error("Lỗi video: " + event.data);
        document.querySelector(".video-box").innerHTML =
          '<div style="color:white;text-align:center;padding-top:20%;">Lỗi tải video (Mã: ' +
          event.data +
          ")</div>";
      },
      onStateChange: onPlayerStateChange,
    },
  });
}

function onPlayerStateChange(event) {
  if (event.data == YT.PlayerState.PLAYING) {
    timeUpdater = setInterval(updateTimeline, 500);
  } else {
    clearInterval(timeUpdater);
  }
}

function updateTimeline() {
  if (player && player.getCurrentTime) {
    var currentTime = player.getCurrentTime();
    var activeIndex = 0;

    for (var i = 0; i < CHAPTER_TIMES.length; i++) {
      // Lấy mảng mốc thời gian từ HTML
      if (currentTime >= CHAPTER_TIMES[i]) activeIndex = i;
      else break;
    }

    var chapterItems = document.querySelectorAll(".chapter-item");
    chapterItems.forEach(function (item, index) {
      if (index === activeIndex) {
        if (!item.classList.contains("playing")) {
          document
            .querySelectorAll(".chapter-item")
            .forEach((i) => i.classList.remove("playing"));
          item.classList.add("playing");
        }
      }
    });
  }
}

function seekTo(seconds) {
  if (player && player.seekTo) {
    player.seekTo(seconds, true);
    player.playVideo();
  }
}

// Gọi script tải thư viện Youtube
var tag = document.createElement("script");
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName("script")[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
