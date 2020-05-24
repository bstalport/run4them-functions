import * as functions from 'firebase-functions';
//import { snapshotConstructor } from 'firebase-functions/lib/providers/firestore';
//import { admin } from 'firebase-admin/lib/database';
import * as admin from 'firebase-admin';

// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

"use strict";
//admin.initializeApp();
const db = admin.firestore();
const statusValidated = 'validated';

export const updateActivityValue = functions.firestore
    .document('Activities/{ActivityId}')
    .onWrite((snapshotActivity, context) => {
        const activity = snapshotActivity.after.data();
        if (activity) {
            if (activity.status !== statusValidated) {
                return db.runTransaction(t => {
                    return t.get(db.collection('Config').doc('config'))
                        .then(config => {
                            const conf = config.data();
                            if (conf) {
                                //const startfulldate = admin.firestore.Timestamp.fromDate(activity.creationTime);
                                //const date = new Date(activity.creationTime);

                                //console.log(activity.creationTime.toMillis());
                                //console.log(startfulldate);
                                const query = db.collection("Campains")
                                    .where('sponsorId', '==', activity.sponsorId)
                                    //.orderBy('startDate', 'desc')
                                    //.startAt(activity.creationTime)
                                    //.where('startDate', '<=', activity.creationTime.toMillis())
                                    //.where('endDate', '>=', activity.creationTime.toMillis())
                                    .limit(1);
                                return t.get(query)
                                    .then(camp => {
                                        camp.forEach(documentSnapshot => {
                                            const campains = documentSnapshot.data()
                                            //console.log(campains.startDate);
                                            if (campains) {
                                                // compute activity price
                                                const val = (activity.distance * conf.valuePerKm) / 1000;

                                                // update activity
                                                t.update(snapshotActivity.after.ref, {
                                                    value: val,
                                                    currency: 'EUR',
                                                    status: statusValidated
                                                });

                                                // Update campain
                                                return t.update(db.collection("Campains").doc(documentSnapshot.id), {
                                                    budgetDetails: admin.firestore.FieldValue.arrayUnion({
                                                        value: val,
                                                        id: snapshotActivity.after.id
                                                    }),
                                                    budgetUsed: admin.firestore.FieldValue.increment(val)
                                                });

                                            } else {
                                                return null;
                                            }
                                        });
                                    }).catch(err => {
                                        return err;
                                    });

                            } else {
                                return null;
                            }
                        }).then(result => {
                            return result;
                        }).catch(err => {
                            return err;
                        });
                }).then(result => {
                    return result;
                }).catch(err => {
                    return err;
                });
            } else {
                return null;
            }

        } else {
            return null;
        }
    });
