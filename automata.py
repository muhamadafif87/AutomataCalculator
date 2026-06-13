# AUTOMATA.PY - Facade for Modular Automata Classes and Functions

from dfa import DFA
from nfa import NFA
from thompson import tokenize_regex, regex_to_postfix, build_nfa_from_postfix
from equivalence import check_equivalence
