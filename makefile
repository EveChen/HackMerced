# The following is a makefile for general testing/linting

RUNNER= yarn

test_tomoe:
		cd ./Tomoe; \
			$(RUNNER) install && $(RUNNER) test

test_hackmerced_2017F:
		cd ./HackMerced/2017F; \
			$(RUNNER) install && $(RUNNER) test

test:
	make test_tomoe
	make test_hackmerced_2017F
