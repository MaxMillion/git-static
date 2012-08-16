var express = require("express"),
    gitteh = require("gitteh"),
    mime = require("mime"),
    path = require("path");

gitteh.openRepository(path.join(__dirname, "repository", ".git"), function(error, repository) {
  if (error) throw error;

  var server = express();

  server.get(/^\/HEAD\/(.*)/, function(request, response) {
    repository.getReference("HEAD", function(error, reference) {
      if (error) return serveError(500, error + "", response);
      reference.resolve(function(error, reference) {
        if (error) return serveError(500, error + "", response);
        serveFile(reference.target, request.params[0], response);
      });
    });
  });

  server.get(/^\/([a-f0-9]{40})\/(.*)/, function(request, response) {
    serveFile(request.params[0], request.params[1], response);
  });

  function serveFile(sha1, file, response) {
    repository.getCommit(sha1, function(error, commit) {
      if (error) return serveError(500, error + "", response);
      repository.getTree(commit.tree, function(error, tree) {
        if (error) return serveError(500, error + "", response);
        var found = false;
        tree.entries.forEach(function(entry) {
          if (entry.name === file) {
            repository.getBlob(entry.id, function(error, blob) {
              response.writeHead(200, {"Content-Type": mime.lookup(file, "text/plain") + "; charset=utf-8"});
              response.end(blob.data.toString("UTF-8"));
            });
            found = true;
          }
        });
        if (!found) {
          serveError(404, "File not found.", response);
        }
      });
    });
  }

  function serveError(code, message, response) {
    response.writeHead(code, {"Content-Type": "text/plain"});
    response.end(message);
  }

  server.listen(3000);
});