const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {
  let testThreadId;
  let testReplyId;
  const testBoard = 'test_board';
  const validPassword = 'valid_password';
  const invalidPassword = 'invalid_password';

  test('1. Creating a new thread: POST request to /api/threads/{board}', function(done) {
    chai.request(server)
      .post(`/api/threads/${testBoard}`)
      .send({ text: 'Test Thread', delete_password: validPassword })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.isObject(res.body);
        assert.property(res.body, '_id');
        assert.property(res.body, 'text');
        assert.property(res.body, 'created_on');
        assert.property(res.body, 'bumped_on');
        assert.property(res.body, 'replies');
        assert.isArray(res.body.replies);
        testThreadId = res.body._id;
        done();
      });
  });

  test('2. Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}', function(done) {
    chai.request(server)
      .get(`/api/threads/${testBoard}`)
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.isArray(res.body);
        assert.isAtMost(res.body.length, 10);
        if (res.body.length > 0) {
          assert.isAtMost(res.body[0].replies.length, 3);
        }
        done();
      });
  });

  test('3. Deleting a thread with the incorrect password: DELETE request to /api/threads/{board} with an invalid delete_password', function(done) {
    chai.request(server)
      .delete(`/api/threads/${testBoard}`)
      .send({ thread_id: testThreadId, delete_password: invalidPassword })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'incorrect password');
        done();
      });
  });

  test('4. Deleting a thread with the correct password: DELETE request to /api/threads/{board} with a valid delete_password', function(done) {
    chai.request(server)
      .post(`/api/threads/${testBoard}`)
      .send({ text: 'Thread to Delete', delete_password: validPassword })
      .end(function(err, res) {
        const threadToDelete = res.body._id;
        chai.request(server)
          .delete(`/api/threads/${testBoard}`)
          .send({ thread_id: threadToDelete, delete_password: validPassword })
          .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, 'success');
            done();
          });
      });
  });

  test('5. Reporting a thread: PUT request to /api/threads/{board}', function(done) {
    chai.request(server)
      .put(`/api/threads/${testBoard}`)
      .send({ thread_id: testThreadId })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'reported');
        done();
      });
  });

  test('6. Creating a new reply: POST request to /api/replies/{board}', function(done) {
    chai.request(server)
      .post(`/api/replies/${testBoard}`)
      .send({ thread_id: testThreadId, text: 'Test Reply', delete_password: validPassword })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.isObject(res.body);
        assert.property(res.body, '_id');
        assert.property(res.body, 'text');
        assert.property(res.body, 'created_on');
        testReplyId = res.body._id;
        done();
      });
  });

  test('7. Viewing a single thread with all replies: GET request to /api/replies/{board}', function(done) {
    chai.request(server)
      .get(`/api/replies/${testBoard}`)
      .query({ thread_id: testThreadId })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.isObject(res.body);
        assert.property(res.body, '_id');
        assert.property(res.body, 'text');
        assert.property(res.body, 'created_on');
        assert.property(res.body, 'bumped_on');
        assert.isArray(res.body.replies);
        done();
      });
  });

  test('8. Deleting a reply with the incorrect password: DELETE request to /api/replies/{board} with an invalid delete_password', function(done) {
    chai.request(server)
      .delete(`/api/replies/${testBoard}`)
      .send({ thread_id: testThreadId, reply_id: testReplyId, delete_password: invalidPassword })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'incorrect password');
        done();
      });
  });

  test('9. Deleting a reply with the correct password: DELETE request to /api/replies/{board} with a valid delete_password', function(done) {
    chai.request(server)
      .delete(`/api/replies/${testBoard}`)
      .send({ thread_id: testThreadId, reply_id: testReplyId, delete_password: validPassword })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'success');
        done();
      });
  });

  test('10. Reporting a reply: PUT request to /api/replies/{board}', function(done) {
    chai.request(server)
      .put(`/api/replies/${testBoard}`)
      .send({ thread_id: testThreadId, reply_id: testReplyId })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'reported');
        done();
      });
  });
});