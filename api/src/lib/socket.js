"use strict"

const co = require('co')
const _ = require('lodash')

const Config = require('./config')
const Log = require('./log')
const PaymentFactory = require('../models/payment')
const Ledger = require('./ledger')

module.exports = class Socket {
  static constitute () { return [Config, Log, PaymentFactory, Ledger] }
  constructor (config, log, Payment, ledger) {
    this.log = log('socket')
    this.ledger = ledger
    this.Payment = Payment

    /**
     * Format
     *
     * {
     *   username: {
     *     socketId: socket
     *     socketId: socket
     *     ...
     *   }
     *   {username}: {
     *     socketId: socket
     *     socketId: socket
     *     ...
     *   }
     *   ...
     * }
     */
    this.users = {}
  }

  // Add a subscribed user
  addUser(username) {
    let self = this

    // TODO should socket be aware of the ledger? may need to move this somewhere else
    self.ledger.on('transfer_' + username, function(transfer){
      self.transfer(username, transfer)
    })

    return self.users[username] = self.users[username] || { subscriptions: {} }
  }

  // Remove the user if it doesn't have subscriptions
  cleanup(username) {
    let self = this

    if (self.users[username] && _.isEmpty(self.users[username].subscriptions)) {
      delete this.users[username]

      self.ledger.removeAllListeners('transfer_' + username)
    }
  }

  // Add a subscription under the user
  addSubscription(username, socket) {
    let self = this

    self.log.info('Subscribe ' + username)

    // Add the subscription
    let user = self.users[username] || self.addUser(username)
    user.subscriptions[socket.id] = socket
  }

  // Remove the subscription
  removeSubscription(id) {
    let self = this

    _.map(self.users, function(s, key){
      if (s.subscriptions[id]) {
        delete s.subscriptions[id]
        self.cleanup(key)
      }
    })
  }

  emitToUser(username, event, data) {
    _.map(this.users[username].subscriptions, function(subscription){
      subscription.emit(event, data)
    })
  }

  attach (app) {
    let self = this

    // TODO ensure the username is the currently logged in user
    app.io.route('subscribe', function (next, username) {
      self.addSubscription(username, this.socket)
    })

    app.io.use(function* (next) {
      self.log.info('Connected ' + this.socket.id)
      yield* next
      self.log.info('Disconnected ' + this.socket.id)
      self.removeSubscription(this.socket.id)
    })
  }

  transfer(username, transfer) {
    let self = this

    // TODO move this logic somewhere else?
    self.Payment.findOne({where: {transfers: transfer.id}})
      .then(function (data) {
        self.log.info('payment for ' + username)

        self.emitToUser(username, 'payment', data)
      })

    // Fire a balance update event
    // TODO move somewhere else
    co(function *() {
      var account = yield self.ledger.getAccount({username: username}, true)
      self.updateBalance(username, account.balance)
    }).catch((err) => {
      // TODO handle
    })
  }

  updateBalance(username, balance) {
    let self = this

    self.log.info('balance update for ' + username)

    // TODO signup click reload, gets you an exception
    self.emitToUser(username, 'balance', balance)
  }
}
