/**
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const express = require('express');
//const cookieParser = require('cookie-parser')();
const bodyParser = require('body-parser');
//const cors = require('cors')({origin: true});
const app = express().use(bodyParser.json());


//app.use(cors);
//app.use(cookieParser);

// Creates the endpoint for our webhook
app.post('/stravaWebHook', (req: any, res: any) => {
  if ((req.body.aspect_type === 'create' || req.body.aspect_type === 'update') && req.body.object_type === 'activity') {
    // new activity to store in db for later
    const db = admin.firestore();
    //db.collection('Config').doc('config').get().then((conf) => {
      //const config = conf.data();
      //if (config) {
        //const subscription = config.data().stravaSubscriptionId;
        //console.log('Strava Subscription Id: ', subscription);
        //if (req.body.subscription_id === subscription) {
          db.collection('stravaUnregisteredActivities')
            .add(req.body)
            .then(() => {
              console.log('New Activity logged', req.body);
            }).catch((error) => console.error(error));
        //}
      //}
    //}).catch((error) => console.error(error));
  }
  console.log('EVENT_RECEIVED',req.body);
  res.status(200).send('EVENT_RECEIVED');
});

// Adds support for GET requests to our webhook
app.get('/stravaWebHook', (req: any, res: any) => {
  // Your verify token. Should be a random string.
  const VERIFY_TOKEN = "f7CLWLLPUNsJMbgV4fc4dhKEEfmqy6Gc";
  // Parses the query params
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  // Checks if a token and mode is in the query string of the request
  if (mode && token) {
    // Verifies that the mode and token sent are valid
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      // Responds with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.json({ "hub.challenge": challenge });
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});

//app.use(validateFirebaseIdToken);
// This HTTPS endpoint can only be accessed by your Firebase Users.
// Requests need to be authorized by providing an `Authorization` HTTP header
// with value `Bearer <Firebase ID Token>`.
export const activityServer = functions.https.onRequest(app);



// Express middleware that validates Firebase ID Tokens passed in the Authorization HTTP header.
// The Firebase ID token needs to be passed as a Bearer token in the Authorization HTTP header like this:
// `Authorization: Bearer <Firebase ID Token>`.
// when decoded successfully, the ID Token content will be added as `req.user`.
/*const validateFirebaseIdToken = async  (req:any, res:any, next:any ) => {
  console.log('Check if request is authorized with Firebase ID token');

  if ((!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) &&
      !(req.cookies && req.cookies.__session)) {
    console.error('No Firebase ID token was passed as a Bearer token in the Authorization header.',
        'Make sure you authorize your request by providing the following HTTP header:',
        'Authorization: Bearer <Firebase ID Token>',
        'or by passing a "__session" cookie.');
    res.status(403).send('Unauthorized');
    return;
  }

  let idToken;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    console.log('Found "Authorization" header');
    // Read the ID Token from the Authorization header.
    idToken = req.headers.authorization.split('Bearer ')[1];
  } else if(req.cookies) {
    console.log('Found "__session" cookie');
    // Read the ID Token from cookie.
    idToken = req.cookies.__session;
  } else {
    // No cookie
    res.status(403).send('Unauthorized');
    return;
  }

  try {
    const decodedIdToken = await admin.auth().verifyIdToken(idToken);
    console.log('ID Token correctly decoded', decodedIdToken);
    req.user = decodedIdToken;
    next();
    return;
  } catch (error) {
    console.error('Error while verifying Firebase ID token:', error);
    res.status(403).send('Unauthorized');
    return;
  }
};
*/
