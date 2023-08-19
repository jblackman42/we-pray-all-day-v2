const ensureAuthenticated = (req,res,next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  // req.flash('error_message', 'please login to view this resourcenet');
  return res.render('pages/login', { error: null })
}



module.exports = {
  ensureAuthenticated
}