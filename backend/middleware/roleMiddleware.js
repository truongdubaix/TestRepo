export const hasRole =
  (...allowed) =>
  (req, res, next) => {
    try {

      const userRoles = req.user?.roles || (req.user?.role ? [req.user.role] : []);


      const ok = userRoles.some((r) => allowed.includes(r));
      if (!ok) return res.status(403).json({ message: "Forbidden" });


      next();
    } catch {

      return res.status(403).json({ message: "Forbidden" });
    }
  };
