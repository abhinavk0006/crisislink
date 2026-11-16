// mongosh demonstration. Use a new database for createCollection.
// SQL IDs 101 and 1 refer to the supplied fictional classroom seed.
db = db.getSiblingDB('crisislink');
db.createCollection('field_notes', {
  validator: { $jsonSchema: {
    bsonType: 'object',
    required: ['emergency_id','author_id','author_name','text','tags','assessment','created_at','updated_at'],
    properties: {
      emergency_id: {bsonType:'int',minimum:1},
      author_id: {bsonType:'int',minimum:1},
      author_name: {bsonType:'string'},
      text: {bsonType:'string',minLength:5,maxLength:2000},
      tags: {bsonType:'array',maxItems:8,items:{bsonType:'string'}},
      assessment: {bsonType:'object'},
      created_at: {bsonType:'date'},
      updated_at: {bsonType:'date'}
    }
  }}, validationAction:'error'
});
db.field_notes.createIndex({emergency_id:1,created_at:-1});
db.field_notes.createIndex({text:'text',tags:'text'});

// CREATE
const noteId = db.field_notes.insertOne({
  emergency_id:101,author_id:1,author_name:'Demo Coordinator',
  text:'Training evacuation route checked and clear',tags:['safety','training'],
  assessment:{safety:'Route clear'},created_at:new Date(),updated_at:new Date()
}).insertedId;
// READ and full-text feature
db.field_notes.find({emergency_id:101}).sort({created_at:-1});
db.field_notes.find({emergency_id:101,$text:{$search:'evacuation'}});
// UPDATE
db.field_notes.updateOne({_id:noteId},{$set:{text:'Training evacuation completed safely',updated_at:new Date()}});
// Aggregation: note count by tag for an incident
db.field_notes.aggregate([
 {$match:{emergency_id:101}},{$unwind:'$tags'},
 {$group:{_id:'$tags',count:{$sum:1}}},{$sort:{count:-1}}
]);
// DELETE only the disposable note created above
db.field_notes.deleteOne({_id:noteId});
