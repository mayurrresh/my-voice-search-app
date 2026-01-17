import mongoose from "mongoose";

const searchSchema = new mongoose.Schema({
  query: {
    type: String,
    required: true
  },
  username: {
    type: String,
    default: "Guest"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Search = mongoose.model("Search", searchSchema);

export default Search;
