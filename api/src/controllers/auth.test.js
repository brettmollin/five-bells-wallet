"use strict"

const appHelper = require('../../test/helpers/app')
const exampleApiData = require('../../test/data/api')

describe('Auth', function() {
  let agent

  beforeEach(function () {
    agent = appHelper.create()
  })

  describe('POST /auth/register', function () {
    it('create the user', function (done) {
      agent
        .post('/auth/register')
        .send({
          username: 'alice',
          password: 'alice'
        })
        .expect(exampleApiData.accounts.alice, done)
    })
  })

  describe('POST /auth/login', function () {
    it('login user', function (done) {
      // Create the user
      agent
        .post('/auth/register')
        .send({
          username: 'alice',
          password: 'alice'
        })
        .end(function(){
          // Try to login
          agent
            .post('/auth/login')
            .send({
              username: 'alice',
              password: 'alice'
            })
            .expect(exampleApiData.accounts.alice, done)
        })
    })
  })
})
