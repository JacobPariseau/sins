// grab the mongoose module
const mongoose = require('mongoose');

// define our card model
// module.exports allows us to pass this to other files when it is called
mongoose.model('Card', {
  primary: {
    type: String
  },
  secondary: {
    type: String
  },
  tertiary: {
    type: String
  },
  type: {
    type: String,
    enum: ['event', 'action', 'status', 'trap']
  },
  model: {
    type: String,
  },
  theme: {
    type: String
  },
  public: {
    type: Boolean
  },
  reqs: {
    type: String
  },
  deck: {
    type: String,
    enum: ['event', 'burn']
  },
  data: [{
    type: String
  }],
  frequency: {
    type: Number,
    default: 1
  }
});
