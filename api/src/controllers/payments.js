"use strict"

module.exports = PaymentsControllerFactory

const _ = require('lodash')
const request = require('five-bells-shared/utils/request')
const Auth = require('../lib/auth')
const Log = require('../lib/log')
const Ledger = require('../lib/ledger')
const Config = require('../lib/config')
const Utils = require('../lib/utils')
const PaymentFactory = require('../models/payment')
const InvalidLedgerAccountError = require('../errors/invalid-ledger-account-error')
const LedgerInsufficientFundsError = require('../errors/ledger-insufficient-funds-error')
const NoPathsError = require('../errors/no-paths-error')

PaymentsControllerFactory.constitute = [Auth, PaymentFactory, Log, Ledger, Config, Utils]
function PaymentsControllerFactory (Auth, Payment, log, ledger, config, utils) {
  log = log('payments')

  return class PaymentsController {
    static init (router) {
      router.get('/payments', Auth.checkAuth, this.getHistory)
      router.post('/payments/findPath', Auth.checkAuth, this.findPath)
      router.put('/payments/:id', Auth.checkAuth, Payment.createBodyParser(), this.putResource)

      router.post('/receivers/:username/payments', this.prepare)
    }

    /**
     * @api {get} /payments User payments history
     * @apiName GetPayments
     * @apiGroup Payment
     * @apiVersion 1.0.0
     *
     * @apiDescription Get user payments history
     *
     * @apiParam {String} page Current page number
     * @apiParam {String} limit Number of payments
     *
     * @apiExample {shell} Get last 2 payments
     *    curl -X GET -H "Authorization: Basic YWxpY2U6YWxpY2U="
     *    https://wallet.example/payments?page=1&limit=2
     *
     * @apiSuccessExample {json} 200 Response:
     *    HTTP/1.1 200 OK
     *    {
     *      "list": [
     *        {
     *          "id": "15a3cbb8-d0f3-410e-8a59-14e8dee14abd",
     *          "source_user": 1,
     *          "source_account": "https://wallet.example/ledger/accounts/alice",
     *          "destination_user": 2,
     *          "destination_account": "https://wallet.example/ledger/accounts/bob",
     *          "transfers": "https://wallet.example/ledger/transfers/3d4c9c8e-204a-4213-9e91-88b64dad8604",
     *          "state": null,
     *          "source_amount": "12",
     *          "destination_amount": "12",
     *          "created_at": "2016-04-19T20:18:18.040Z",
     *          "completed_at": null,
     *          "updated_at": "2016-04-19T20:18:18.040Z",
     *          "sourceUserUsername": "alice",
     *          "destinationUserUsername": "bob"
     *        },
     *        {
     *          "id": "e1d3c588-807c-4d4f-b25c-61842b5ead6d",
     *          "source_user": 1,
     *          "source_account": "https://wallet.example/ledger/accounts/alice",
     *          "destination_user": 2,
     *          "destination_account": "https://wallet.example/ledger/accounts/bob",
     *          "transfers": "https://wallet.example/ledger/transfers/d1fa49d3-c955-4833-803a-df0c43eab044",
     *          "state": null,
     *          "source_amount": "1",
     *          "destination_amount": "1",
     *          "created_at": "2016-04-19T20:15:57.055Z",
     *          "completed_at": null,
     *          "updated_at": "2016-04-19T20:15:57.055Z",
     *          "sourceUserUsername": "alice",
     *          "destinationUserUsername": "bob"
     *        }
     *      ],
     *      "totalPages": 5
     *    }
     */
    static * getHistory () {
      const page = this.query.page
      const limit = this.query.limit

      const payments = yield Payment.getUserPayments(this.req.user, page, limit)

      this.body = {
        list: payments.rows,
        totalPages: Math.ceil(payments.count / limit)
      }
    }

    /**
     * @api {put} /payments/:id Make payment
     * @apiName PutPayments
     * @apiGroup Payment
     * @apiVersion 1.0.0
     *
     * @apiDescription Make payment
     *
     * @apiParam {String} id generated payment uuid
     * @apiParam {String} destination_account destination account
     * @apiParam {String} source_amount source amount
     * @apiParam {String} destination_amount destination amount
     * @apiParam {String} source_memo memo for the source
     * @apiParam {String} destination_memo memo for the destination
     * @apiParam {String} message text message for the destination
     * @apiParam {String} path path
     *
     * @apiExample {shell} Make a payment with the destination_amount
     *    curl -X PUT -H "Authorization: Basic YWxpY2U6YWxpY2U=" -d
     *    '{
     *        "destination_account": "bob@wallet.example",
     *        "destination_amount": "1"
     *    }'
     *    https://wallet.example/payments/9efa70ec-08b9-11e6-b512-3e1d05defe78
     *
     * @apiSuccessExample {json} 200 Response:
     *    HTTP/1.1 200 OK
     */

    // TODO handle payment creation. Shouldn't rely on notification service
    static * putResource () {
      const _this = this

      let id = _this.params.id
      request.validateUriParameter('id', id, 'Uuid')
      id = id.toLowerCase()
      let payment = this.body

      payment.id = id

      payment.source_user = this.req.user.id

      let destination = yield utils.parseDestination({
        destination: payment.destination_account
      })

      // TODO fill the destination_user
      const options = {
        sourceAmount: payment.source_amount,
        destination: destination,
        destinationAmount: payment.destination_amount,
        path: payment.path,
        source_memo: payment.source_memo,
        destination_memo: payment.destination_memo,
        message: payment.message,
        username: this.req.user.username,
        password: this.req.user.password
      }

      // Try doing the ledger transaction
      let transfer

      try {
        transfer = yield ledger.transfer(options)

        // Store the payment
        let dbPayment = new Payment()
        dbPayment.setDataExternal({
          transfers: transfer.id,
          message: payment.message,
          status: 'pending'
        })
        dbPayment.save()

        log.debug('Ledger transfer payment ID ' + id)
      } catch (e) {
        if (e && e.response) {
          let error = JSON.parse(e.response.error.text)

          if (error.id === 'UnprocessableEntityError') {
            throw new InvalidLedgerAccountError(error.message)
          } else if (error.id === 'InsufficientFundsError') {
            throw new LedgerInsufficientFundsError(error.message)
          } else {
            throw e
          }
        } else {
          throw e
        }
      }

      // TODO should be something more meaningful
      this.status = 200
    }

    /**
     * @api {POST} /payments/findPath Find path
     * @apiName FindPath
     * @apiGroup Payment
     * @apiVersion 1.0.0
     *
     * @apiDescription Find path
     *
     * @apiParam {String} destination destination
     * @apiParam {String} source_amount source amount
     * @apiParam {String} destination_amount destination amount
     *
     * @apiExample {shell} Find path
     *    curl -X POST -H "Authorization: Basic YWxpY2U6YWxpY2U=" -d
     *    '{
     *        "destination": "bob@wallet.example",
     *        "destination_amount": "10"
     *    }'
     *    https://wallet.example/payments/findPath
     *
     * @apiSuccessExample {json} 200 Response:
     *    HTTP/1.1 200 OK
     *    {
     *      "sourceAmount": "10",
     *      "destinationAmount": "10"
     *    }
     */

    // TODO handle not supplied params
    static * findPath () {
      let destination

      destination = yield utils.parseDestination({
        destination: this.body.destination
      })

      if (destination.type === 'local') {
        let amount = this.body.source_amount || this.body.destination_amount

        this.body = {
          sourceAmount: amount,
          destinationAmount: amount
        }

        return
      }

      const options = {
        destination: destination,
        sourceAmount: this.body.source_amount,
        destinationAmount: this.body.destination_amount,
        username: this.req.user.username
      }

      let path = yield ledger.findPath(options)

      if (!path) {
        throw new NoPathsError("No paths to specified destination found")
      }

      this.body = path
    }

    /**
     * @api {POST} /receivers/:username/payments Prepare a payment
     * @apiName PreparePayment
     * @apiGroup Payment
     * @apiVersion 1.0.0
     *
     * @apiDescription Prepare a payment
     *
     * @apiExample {shell} Prepare a payment
     *    curl -X POST
     *    https://wallet.example/receivers/alice/payments
     *
     * @apiSuccessExample {json} 200 Response:
     *    HTTP/1.1 200 OK
     *    {
     *      "paymentId": "1bbeea29-f9aa-49aa-abb1-9954400c9ca7",
     *      "receipt_condition": "cc:0:3:eAOobLmr23UI0wZgfmW1mis_b7cxrrRpNqvI2c37LI4:32"
     *    }
     */

    // TODO:PERFORMANCE Expire pending payments (remove from db)
    static * prepare () {
      const memo = this.body.memo
      const prepared = this.body = ledger.preparePayment()

      if (!memo) return

      let paymentObj = {
        id: prepared.paymentId,
        state: 'pending',
        message: memo
      }

      // Create the payment object
      let payment = new Payment()
      payment.setDataExternal(paymentObj)

      try {
        yield payment.create()
      } catch(e) {
        // TODO handle
      }
    }
  }
}
