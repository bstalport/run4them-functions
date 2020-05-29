import * as functions from 'firebase-functions';
//import { snapshotConstructor } from 'firebase-functions/lib/providers/firestore';
//import { admin } from 'firebase-admin/lib/database';
import * as admin from 'firebase-admin';

// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

"use strict";
//admin.initializeApp();
const db = admin.firestore();
//admin.firestore.settings({ timestampsInSnapshots: true })
const statusValidated = 'validated';

function register_error(sMsg: string, oActivity: any) {
    return db.collection("ActivityBudgetUpdateErrors").add({
        message: sMsg.toString(),
        activity: oActivity,
        creationTime: admin.firestore.Timestamp.now(),
    })
        .then((DocReference) => {
            console.error(sMsg, oActivity);
        })
        .catch((error) => {
            console.error("Erreur durant l'enregistrement de l'erreur ;-)")
        });
}

export const updateActivityValue = functions.firestore
    .document('Activities/{ActivityId}')
    .onCreate((snapshotActivity, context) => {
        const activity = snapshotActivity.data();
        if (activity && activity.status !== statusValidated) {
            return db.runTransaction(t => {
                return t.get(db.collection('Config').doc('config'))
                    .then(config => {
                        const conf = config.data();
                        if (conf) {
                            const query = db.collection("Campains")
                                .where('sponsorId', '==', activity.sponsorId)

                            return t.get(query)
                                .then(camp => {
                                    camp.forEach(documentSnapshot => {
                                        const campains = documentSnapshot.data()
                                        if (campains) {
                                            if (campains.startDate.toMillis() <= activity.creationTime.toMillis()
                                                && campains.endDate.toMillis() >= activity.creationTime.toMillis()
                                                && activity.status !== statusValidated
                                                ) {

                                                // compute activity price
                                                const val = (activity.distance * conf.valuePerKm) / 1000;

                                                // update activity
                                                t.update(snapshotActivity.ref, {
                                                    value: val,
                                                    currency: 'EUR',
                                                    status: statusValidated,
                                                    campainId: documentSnapshot.id
                                                });

                                                // Update campain
                                                t.update(db.collection("Campains").doc(documentSnapshot.id), {
                                                    budgetDetails: admin.firestore.FieldValue.arrayUnion({
                                                        value: val,
                                                        id: snapshotActivity.id
                                                    }),
                                                    budgetUsed: admin.firestore.FieldValue.increment(val)
                                                });

                                                // Update totals
                                                return t.update(db.collection("Totals").doc("totals"), {
                                                    totalBudgetUsed: admin.firestore.FieldValue.increment(val)
                                                });


                                            } else {
                                                return register_error("Pas de campagne valide aujourd'hui trouvée pour le sponsor", activity);
                                            }
                                        } else {
                                            return register_error("Pas de campagne trouvée pour le sponsor", activity);
                                        }
                                    });
                                }).catch(err => {
                                    return register_error(err, activity);
                                });

                        } else {
                            return register_error("Configuration manquante", activity);
                        }
                    }).catch(err => {
                        return register_error(err, activity);
                    });
            }).then(result => {
                return result;
            }).catch(err => {
                return register_error(err, activity);
            });
        } else {
            return register_error("Activité non valide", activity);
        }
    });



export const deleteActivityValue = functions.firestore
    .document('Activities/{ActivityId}')
    .onDelete((snapshotActivity, context) => {
        const activity = snapshotActivity.data();
        if (activity) {
            return db.runTransaction(t => {

                return t.get(db.collection('Campains').doc(activity.campainId))
                    .then(camp => {

                        // delete from the campains
                        t.update(db.collection("Campains").doc(activity.campainId), {
                            budgetDetails: admin.firestore.FieldValue.arrayRemove({
                                value: activity.value,
                                id: snapshotActivity.id
                            }),
                            budgetUsed: admin.firestore.FieldValue.increment(-activity.value)
                        });

                        // Update totals
                        return t.update(db.collection("Totals").doc("totals"), {
                            totalBudgetUsed: admin.firestore.FieldValue.increment(-activity.value)
                        });

                    }).catch(err => {
                        return register_error(err, activity);
                    });

            }).then((result: any) => {
                return result;
            }).catch((err: any) => {
                return register_error(err, activity);
            });
        } else {
            return register_error("Activité non valide", activity);
        }
    });