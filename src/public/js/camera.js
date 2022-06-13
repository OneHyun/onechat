const myVideo = document.getElementById("myVideo");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");
const mikeSelect = document.getElementById("mikes");

let myStream;
let muted = false;
let cameraOff = false;

let cameras = [];
let mikes = [];

let selectedAudio;
let selectedVideo;

const getDevices = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();

    cameras = devices.filter((device) => device.kind === "videoinput");
    const currentCamera = myStream.getVideoTracks()[0];

    mikes = devices.filter((device) => device.kind === "audioinput");
    const currentMike = myStream.getAudioTracks()[0];

    cameras.forEach((camera) => {
      const option = document.createElement("option");
      option.value = camera.deviceId;
      option.innerText = camera.label;
      if (currentCamera.label === camera.label) {
        option.selected = true;
      }
      camerasSelect.appendChild(option);
    });

    mikes.forEach((mike) => {
      const option = document.createElement("option");
      option.value = mike.deviceId;
      option.innerText = mike.label;
      if (currentMike.label === mike.label) {
        option.selected = true;
      }
      mikeSelect.appendChild(option);
    });

    if (cameras.length <= 1) {
      camerasSelect.disabled = true;
    }
    if (mikes.length <= 1) {
      mikesSelect.disabled = true;
    }
  } catch (e) {
    console.log(e);
  }
};

const getMedia = async (deviceId) => {
  const initialConstrains = {
    audio: true,
    video: { facingMode: "user" },
  };

  const deviceConstrains = {
    audio:
      mikes.filter((e) => e.deviceId === deviceId).length >= 1
        ? { deviceId: { exact: deviceId } }
        : selectedAudio !== undefined
        ? selectedAudio
        : true,
    video:
      cameras.filter((e) => e.deviceId === deviceId).length >= 1
        ? { deviceId: { exact: deviceId } }
        : selectedVideo !== undefined
        ? selectedVideo
        : { facingMode: "user" },
  };

  try {
    myStream = await navigator.mediaDevices.getUserMedia(
      deviceId ? deviceConstrains : initialConstrains
    );

    myVideo.srcObject = myStream;

    selectedAudio = myStream.getAudioTracks()[0];
    myStream.getAudioTracks()[0].enabled = !muted;

    selectedVideo = myStream.getVideoTracks()[0];
    myStream.getVideoTracks()[0].enabled = !cameraOff;
    if (!deviceId) {
      await getDevices();
    }
  } catch (e) {
    console.log(e);
  }
};
const handleMuteClick = () => {
  myStream
    .getAudioTracks()
    .forEach((track) => (track.enabled = !track.enabled));
  if (!muted) {
    muteBtn.innerText = "Unmute";
    muted = true;
  } else {
    muteBtn.innerText = "Mute";
    muted = false;
  }
};

const handleCameraClick = () => {
  myStream
    .getVideoTracks()
    .forEach((track) => (track.enabled = !track.enabled));
  if (cameraOff) {
    cameraBtn.innerText = "Turn Camera Off";
    cameraOff = false;
  } else {
    cameraBtn.innerText = "Turn Camera On";
    cameraOff = true;
  }
};

const handleCameraChange = async () => {
  console.log(camerasSelect.value);
  await getMedia(camerasSelect.value);
};

const handleMikeChange = async () => {
  console.log(mikeSelect.value);
  await getMedia(mikeSelect.value);
};

getMedia();
muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);

camerasSelect.addEventListener("input", handleCameraChange);
mikeSelect.addEventListener("input", handleMikeChange);
