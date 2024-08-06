const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  githubId: { type: String, required: true, unique: true },
  username: String
});

userSchema.statics.findOrCreate = async function(profile) {
  let user = await this.findOne({ githubId: profile.id });
  if (!user) {
    user = new this({
      githubId: profile.id,
      username: profile.username
    });
    await user.save();
  }
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;