This is a common library for contracts. This is the non-testing contract version which should be imported using dependency, not dev-dependency. All non-testing contract related common contract code should go in this library. Unfortunately, ink does not expose tests from dev-dependencies _and_ build a contract properly, so we are forced to put them in a separate crates: one for testing (common-dev) and one for building contracts (common).