﻿const express = require("express");
const router = express.Router();
const mailService = require("./email.service");

// routes
router.post("/sendNativeNotification", sendNativeNotification);
router.post("/sendToasterNotification", sendToasterNotification);
router.post("/sendSMSOverHTTP", sendSMSOverHTTP);
router.post("/sendSMSOverHTTPA", sendSMSOverHTTPA);
router.post("/sendMailOverHTTP", sendMailOverHTTP);
router.post("/iotHubMsgProc", iotHubMsgProc);

module.exports = router;

function sendNativeNotification(req, res, next) {
  mailService
    .sendNativeNotification(req.body)
    .then((data) => res.json(data))
    .catch((err) => next(err));
}

function sendToasterNotification(req, res, next) {
  mailService
    .sendToasterNotification(req.body)
    .then((data) => res.json(data))
    .catch((err) => next(err));
}

function sendSMSOverHTTP(req, res, next) {
  mailService
    .sendSMSOverHTTP(req.body)
    .then((data) => res.json(data))
    .catch((err) => next(err));
}

function sendSMSOverHTTPA(req, res, next) {
  mailService
    .sendSMSOverHTTPA(req.body)
    .then((data) => res.json(data))
    .catch((err) => next(err));
}

function sendMailOverHTTP(req, res, next) {
  mailService
    .sendMailOverHTTP(req.body)
    .then((data) => res.json(data))
    .catch((err) => next(err));
}

function iotHubMsgProc(req, res, next) {
  mailService
    .iotHubMsgProc(req.body)
    .then(() => res.json(req.body))
    .catch((err) => next(err));
}
