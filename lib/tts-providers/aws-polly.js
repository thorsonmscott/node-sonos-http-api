'use strict';
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');
const AWS = require('aws-sdk');
const settings = require('../../settings');

const DEFAULT_SETTINGS = {
  OutputFormat: 'mp3',
  VoiceId: 'Russell',
  TextType: 'ssml'
};

function polly(phrase, voiceName) {
  if (!settings.aws) {
    return Promise.resolve();

  }

  // Construct a filesystem neutral filename
  const volume = settings.aws.volume || 'default'
  const rate = settings.aws.rate || 'medium'
  const pitch = settings.aws.pitch || 'default'
  const ssml = `<speak><lang xml:lang="en-US"><prosody volume="${volume}" rate="${rate}" pitch="${pitch}">${phrase}</prosody></lang></speak>`

  const dynamicParameters = { Text: ssml };
  const synthesizeParameters = Object.assign({}, DEFAULT_SETTINGS, dynamicParameters);
  if (settings.aws.name) {
    synthesizeParameters.VoiceId = settings.aws.name;
  }
  if (voiceName) {
    synthesizeParameters.VoiceId = voiceName;
  }

  const phraseHash = crypto.createHash('sha1').update(ssml).digest('hex');
  const filename = `polly-${phraseHash}-${synthesizeParameters.VoiceId}.mp3`;
  const filepath = path.resolve(settings.webroot, 'tts', filename);

  const expectedUri = `/tts/${filename}`;
  try {
    fs.accessSync(filepath, fs.R_OK);
    return Promise.resolve(expectedUri);
  } catch (err) {
    console.log(`announce file for phrase "${phrase}" does not seem to exist, downloading`);
  }

  const constructorParameters = Object.assign({ apiVersion: '2016-06-10' }, settings.aws.credentials);

  const polly = new AWS.Polly(constructorParameters);

  return polly.synthesizeSpeech(synthesizeParameters)
    .promise()
    .then((data) => {
      fs.writeFileSync(filepath, data.AudioStream);
      return expectedUri;
    });
}

module.exports = polly;
