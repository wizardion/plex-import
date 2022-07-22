'use strict';

const axios = require('axios');
const path = require('path');


function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

module.exports = class Prism {
  constructor(host, delay=0) {
    this.host = host;
    this.instance = null;
    this.delay = delay;
  }

  async login(username, password) {
    try {
      const response = await axios.post(`${this.host}/api/v1/session`, {username: username, password: password});

      this.instance = axios.create({
        baseURL: `${this.host}/api/v1/`,
        timeout: 1000,
        headers: {'X-Session-ID': response.data.id}
      });

      if (this.delay) {
        await sleep(this.delay);
      }
    } catch (error) {
      throw Error(error && error.response && error.response.data?  error.response.data.error : error);
    }
  }

  async get(id) {
    try {
      var response = await this.instance.get(`photos/${id}`);

      if (this.delay) {
        await sleep(this.delay);
      }
      return response.data;
    } catch (error) {
      throw Error(error && error.response && error.response.data?  error.response.data.error : error);
    }
  }

  async search(query, count=1) {
    try {
      var response = await this.instance.get(`photos`, {
        params: {
          merged: true,
          count: count,
          q: query
        }
      });
      return response.data;
    } catch (error) {
      throw Error(error && error.response && error.response.data?  error.response.data.error : error);
    }
  }
};
